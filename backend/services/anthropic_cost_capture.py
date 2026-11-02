"""Opt-in, post-response Anthropic cost capture for real Clariti runs."""

from __future__ import annotations

import json
import os
import re
import threading
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from services.anthropic_cost import (
    calculate_cost,
    pricing_for_models,
    usage_from_response,
)


BACKEND_DIR = Path(__file__).resolve().parents[1]
CAPTURE_ROOT = BACKEND_DIR / "data" / "cost-experiments" / "real-runs"
TRUE_VALUES = {"1", "true", "yes", "on"}
SESSION_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$")

_write_lock = threading.Lock()
_seen_response_ids: dict[Path, set[str]] = {}
_configuration_warnings: set[str] = set()


def capture_enabled() -> bool:
    return os.getenv("CLARITI_CAPTURE_AI_COSTS", "").strip().lower() in TRUE_VALUES


def capture_session_id() -> Optional[str]:
    value = os.getenv("CLARITI_COST_CAPTURE_SESSION", "").strip()
    if not value:
        return None
    if not SESSION_PATTERN.fullmatch(value):
        raise ValueError(
            "CLARITI_COST_CAPTURE_SESSION must start with a letter or number and "
            "contain only letters, numbers, dots, underscores, or hyphens "
            "(maximum 80 characters)"
        )
    return value


def capture_path(session_id: str) -> Path:
    if not SESSION_PATTERN.fullmatch(session_id):
        raise ValueError(f"Invalid cost capture session ID: {session_id!r}")
    return CAPTURE_ROOT / f"{session_id}.jsonl"


def _warn_once(message: str) -> None:
    with _write_lock:
        if message in _configuration_warnings:
            return
        _configuration_warnings.add(message)
    print(f"[AI-COST-CAPTURE] {message}")


def _load_seen_ids(path: Path) -> set[str]:
    seen = _seen_response_ids.get(path)
    if seen is not None:
        return seen
    seen = set()
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue
            response_id = event.get("response_id")
            if isinstance(response_id, str):
                seen.add(response_id)
    _seen_response_ids[path] = seen
    return seen


def _append_event(path: Path, event: dict[str, Any]) -> bool:
    response_id = str(event["response_id"])
    encoded = json.dumps(event, ensure_ascii=False, separators=(",", ":")) + "\n"
    with _write_lock:
        seen = _load_seen_ids(path)
        if response_id in seen:
            return False
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as output:
            output.write(encoded)
            output.flush()
            os.fsync(output.fileno())
        seen.add(response_id)
    return True


def record_anthropic_response(
    response: Any,
    *,
    agent: str,
    call_site: str,
    requested_model: str,
    call_number: Optional[int] = None,
) -> Optional[dict[str, Any]]:
    """Record usage after a real response without affecting Clariti execution.

    Capture failures are logged and swallowed deliberately. Observability must
    never turn a successful Anthropic response into a failed product action.
    """
    if not capture_enabled():
        return None

    try:
        session_id = capture_session_id()
        if session_id is None:
            _warn_once(
                "Capture is enabled but CLARITI_COST_CAPTURE_SESSION is missing; "
                "no usage events will be written."
            )
            return None

        response_id = str(getattr(response, "id", "") or "")
        if not response_id:
            raise ValueError("Anthropic response has no message ID")
        response_model = str(getattr(response, "model", "") or requested_model)
        event = {
            "captured_at": datetime.now(timezone.utc).isoformat(),
            "capture_session_id": session_id,
            "response_id": response_id,
            "agent": agent,
            "call_site": call_site,
            "call_number": call_number,
            "requested_model": requested_model,
            "response_model": response_model,
        }
        try:
            usage = usage_from_response(response)
            pricing = pricing_for_models(response_model, requested_model)
            cost = calculate_cost(usage, pricing)
            event["usage"] = asdict(usage)
            event["cost_usd"] = cost.json_dict()
        except Exception as calculation_error:
            event["calculation_error"] = (
                f"{type(calculation_error).__name__}: {calculation_error}"
            )

        path = capture_path(session_id)
        if _append_event(path, event):
            if "calculation_error" in event:
                print(
                    "[AI-COST-CAPTURE] "
                    f"session={session_id} agent={agent} response={response_id} "
                    f"ERROR={event['calculation_error']}"
                )
            else:
                print(
                    "[AI-COST-CAPTURE] "
                    f"session={session_id} agent={agent} response={response_id} "
                    f"cost=${cost.total_usd:.8f}"
                )
        return event
    except Exception as exc:
        _warn_once(f"Failed to record Anthropic usage: {type(exc).__name__}: {exc}")
        return None
