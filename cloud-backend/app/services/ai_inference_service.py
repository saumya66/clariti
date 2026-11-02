"""Hosted Claude inference, user credit accounting, and request leases."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import anthropic
from bson import ObjectId
from pymongo import ReturnDocument
from pymongo.database import Database

from app.core.config import settings
from app.services.ai_cost_service import SUPPORTED_MODELS, calculate_cost, usd_to_microusd


class AIInferenceError(Exception):
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_user_ai_fields(db: Database, user_id: str) -> None:
    default_credit = usd_to_microusd(settings.DEFAULT_FREE_CREDIT_USD)
    # A pipeline update initializes legacy users in one database operation while
    # preserving explicit zero balances and account-level access decisions.
    db.users.update_one(
        {"_id": ObjectId(user_id)},
        [{
            "$set": {
                "free_credit_microusd": {"$ifNull": ["$free_credit_microusd", default_credit]},
                "spent_microusd": {"$ifNull": ["$spent_microusd", 0]},
                "ai_access_status": {"$ifNull": ["$ai_access_status", "active"]},
                "ai_request_active": {"$ifNull": ["$ai_request_active", False]},
            }
        }],
    )


def credit_summary(user: dict[str, Any]) -> dict[str, Any]:
    allowance = int(user.get("free_credit_microusd", 0) or 0)
    spent = int(user.get("spent_microusd", 0) or 0)
    return {
        "free_credit_microusd": allowance,
        "spent_microusd": spent,
        "remaining_microusd": max(allowance - spent, 0),
        "ai_access_status": user.get("ai_access_status", "active"),
    }


def get_credit(db: Database, user_id: str) -> dict[str, Any]:
    _ensure_user_ai_fields(db, user_id)
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise AIInferenceError(401, "User not found")
    return credit_summary(user)


def _check_global_switch(db: Database) -> None:
    config = db.system_settings.find_one({"_id": "ai"}) or {}
    if config.get("ai_requests_enabled", True) is False:
        reason = config.get("disabled_reason") or "AI usage is temporarily paused."
        raise AIInferenceError(503, reason)


def _acquire_lease(db: Database, user_id: str) -> dict[str, Any]:
    _ensure_user_ai_fields(db, user_id)
    now = _now()
    stale_before = now - timedelta(seconds=settings.AI_REQUEST_LEASE_SECONDS)
    user = db.users.find_one_and_update(
        {
            "_id": ObjectId(user_id),
            "ai_access_status": "active",
            "$expr": {"$lt": ["$spent_microusd", "$free_credit_microusd"]},
            "$or": [
                {"ai_request_active": False},
                {"ai_request_active": {"$exists": False}},
                {"ai_request_started_at": {"$lt": stale_before}},
            ],
        },
        {"$set": {"ai_request_active": True, "ai_request_started_at": now}},
        return_document=ReturnDocument.AFTER,
    )
    if user:
        return user

    current = db.users.find_one({"_id": ObjectId(user_id)})
    if not current:
        raise AIInferenceError(401, "User not found")
    if current.get("ai_access_status", "active") != "active":
        raise AIInferenceError(403, "AI access is disabled for this account.")
    if int(current.get("spent_microusd", 0)) >= int(current.get("free_credit_microusd", 0)):
        raise AIInferenceError(402, "Your free AI credit has been used.")
    raise AIInferenceError(409, "Another AI request is already running for this account.")


def _release_lease(db: Database, user_id: str) -> None:
    db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"ai_request_active": False, "ai_request_started_at": None}},
    )


def run_inference(
    db: Database,
    *,
    user_id: str,
    mode: str,
    payload: dict[str, Any],
    agent: str,
    call_site: str,
    call_number: int | None,
) -> dict[str, Any]:
    _check_global_switch(db)
    if not settings.ANTHROPIC_API_KEY:
        raise AIInferenceError(503, "Hosted AI is not configured.")

    model = str(payload.get("model", ""))
    if not model:
        raise AIInferenceError(400, "Claude model is required.")
    if model not in SUPPORTED_MODELS:
        raise AIInferenceError(400, f"Unsupported Claude model: {model}")
    if "api_key" in payload:
        raise AIInferenceError(400, "API keys are not accepted in inference payloads.")

    _acquire_lease(db, user_id)
    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        try:
            if mode == "beta_messages":
                response = client.beta.messages.create(**payload)
            elif mode == "messages":
                response = client.messages.create(**payload)
            else:
                raise AIInferenceError(400, "Unsupported inference mode.")
        except AIInferenceError:
            raise
        except anthropic.AuthenticationError as exc:
            raise AIInferenceError(503, "Hosted AI authentication failed.") from exc
        except anthropic.RateLimitError as exc:
            raise AIInferenceError(429, "Claude is temporarily busy. Please try again.") from exc
        except anthropic.APIError as exc:
            raise AIInferenceError(502, f"Claude request failed: {exc}") from exc

        response_doc = response.model_dump(mode="json")
        response_id = str(response_doc.get("id", ""))
        if not response_id:
            raise AIInferenceError(502, "Claude returned a response without an ID.")

        cost_microusd, usage, pricing = calculate_cost(model, response_doc.get("usage", {}))
        event = {
            "user_id": user_id,
            "anthropic_response_id": response_id,
            "model": response_doc.get("model") or model,
            "requested_model": model,
            "mode": mode,
            "agent": agent,
            "call_site": call_site,
            "call_number": call_number,
            "usage": usage,
            "cost_microusd": cost_microusd,
            "pricing_usd_per_mtok": pricing,
            "pricing_version": "anthropic-2026-11-01-validated",
            "created_at": _now(),
        }
        try:
            db.ai_usage_events.insert_one(event)
        except Exception as exc:
            # A duplicate response ID must never charge the same response twice.
            if db.ai_usage_events.find_one({"anthropic_response_id": response_id}):
                raise AIInferenceError(409, "This Claude response was already recorded.") from exc
            raise

        user = db.users.find_one_and_update(
            {"_id": ObjectId(user_id)},
            {"$inc": {"spent_microusd": cost_microusd}, "$set": {"updated_at": _now()}},
            return_document=ReturnDocument.AFTER,
        )
        return {
            "response": response_doc,
            "billing": credit_summary(user or {}),
            "charged_microusd": cost_microusd,
        }
    finally:
        _release_lease(db, user_id)
