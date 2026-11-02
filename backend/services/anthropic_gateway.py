"""Anthropic-compatible client that sends inference through Clariti Cloud."""

from __future__ import annotations

from typing import Any, Optional

import httpx
from anthropic.types import Message

from cloud_client import CLOUD_API_URL


class AnthropicGatewayError(RuntimeError):
    """A user-readable hosted inference failure."""


def _json_safe(value: Any) -> Any:
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json")
    if isinstance(value, dict):
        return {key: _json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(item) for item in value]
    return value


class _MessagesProxy:
    def __init__(self, gateway: "AnthropicGatewayClient", mode: str):
        self._gateway = gateway
        self._mode = mode

    def create(self, **payload: Any) -> Message:
        return self._gateway.create_message(self._mode, payload)


class _BetaProxy:
    def __init__(self, gateway: "AnthropicGatewayClient"):
        self.messages = _MessagesProxy(gateway, "beta_messages")


class AnthropicGatewayClient:
    """Small subset of the Anthropic SDK used by Clariti's agents."""

    def __init__(
        self,
        *,
        cloud_token: str,
        agent: str = "unknown",
        call_site: str = "unknown",
        timeout_seconds: float = 300.0,
    ):
        if not cloud_token:
            raise ValueError("Sign in to use Clariti's hosted AI.")
        self.cloud_token = cloud_token
        self.agent = agent
        self.call_site = call_site
        self.timeout_seconds = timeout_seconds
        self.messages = _MessagesProxy(self, "messages")
        self.beta = _BetaProxy(self)
        self.call_number: Optional[int] = None
        self.last_billing: Optional[dict[str, Any]] = None

    def create_message(self, mode: str, payload: dict[str, Any]) -> Message:
        body = {
            "mode": mode,
            "payload": _json_safe(payload),
            "agent": self.agent,
            "call_site": self.call_site,
            "call_number": self.call_number,
        }
        try:
            response = httpx.post(
                f"{CLOUD_API_URL}/api/v1/ai/inference",
                headers={"Authorization": f"Bearer {self.cloud_token}"},
                json=body,
                timeout=self.timeout_seconds,
            )
        except httpx.RequestError as exc:
            raise AnthropicGatewayError(
                "Clariti could not reach hosted AI. Check your connection and try again."
            ) from exc

        if response.status_code >= 400:
            try:
                detail = response.json().get("detail")
            except Exception:
                detail = None
            raise AnthropicGatewayError(detail or f"Hosted AI request failed ({response.status_code}).")

        result = response.json()
        self.last_billing = result.get("billing")
        return Message.model_validate(result["response"])
