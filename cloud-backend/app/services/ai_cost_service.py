"""Deterministic Anthropic usage pricing for the hosted inference gateway."""

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Any


MICRODOLLARS_PER_DOLLAR = Decimal("1000000")
TOKENS_PER_MTOK = Decimal("1000000")

# Pricing snapshot validated against the Anthropic dashboard on 2026-11-01.
HAIKU_45_PRICING = {
    "input_usd_per_mtok": Decimal("1.00"),
    "output_usd_per_mtok": Decimal("5.00"),
    "cache_write_5m_usd_per_mtok": Decimal("1.25"),
    "cache_write_1h_usd_per_mtok": Decimal("2.00"),
    "cache_read_usd_per_mtok": Decimal("0.10"),
}

SUPPORTED_MODELS = {
    "claude-haiku-4-5",
    "claude-haiku-4-5-20251001",
}


def usd_to_microusd(value: str | Decimal) -> int:
    return int((Decimal(str(value)) * MICRODOLLARS_PER_DOLLAR).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def _field(value: Any, name: str, default: Any = 0) -> Any:
    if isinstance(value, dict):
        return value.get(name, default)
    return getattr(value, name, default)


def normalize_usage(usage: Any) -> dict[str, int]:
    cache_creation = _field(usage, "cache_creation", {}) or {}
    total_cache_write = int(_field(usage, "cache_creation_input_tokens", 0) or 0)
    cache_write_5m = int(_field(cache_creation, "ephemeral_5m_input_tokens", 0) or 0)
    cache_write_1h = int(_field(cache_creation, "ephemeral_1h_input_tokens", 0) or 0)
    categorized = cache_write_5m + cache_write_1h
    if categorized < total_cache_write:
        cache_write_5m += total_cache_write - categorized
    elif categorized > total_cache_write and total_cache_write:
        raise ValueError("Cache-write token categories exceed the reported aggregate")
    return {
        "input_tokens": int(_field(usage, "input_tokens", 0) or 0),
        "output_tokens": int(_field(usage, "output_tokens", 0) or 0),
        "cache_write_5m_tokens": cache_write_5m,
        "cache_write_1h_tokens": cache_write_1h,
        "cache_read_tokens": int(_field(usage, "cache_read_input_tokens", 0) or 0),
    }


def calculate_cost(model: str, usage: Any) -> tuple[int, dict[str, int], dict[str, str]]:
    if model not in SUPPORTED_MODELS:
        raise ValueError(f"Unsupported model for billing: {model}")
    normalized = normalize_usage(usage)
    p = HAIKU_45_PRICING
    cost = (
        Decimal(normalized["input_tokens"]) * p["input_usd_per_mtok"]
        + Decimal(normalized["output_tokens"]) * p["output_usd_per_mtok"]
        + Decimal(normalized["cache_write_5m_tokens"]) * p["cache_write_5m_usd_per_mtok"]
        + Decimal(normalized["cache_write_1h_tokens"]) * p["cache_write_1h_usd_per_mtok"]
        + Decimal(normalized["cache_read_tokens"]) * p["cache_read_usd_per_mtok"]
    ) / TOKENS_PER_MTOK
    pricing = {key: str(value) for key, value in p.items()}
    return usd_to_microusd(cost), normalized, pricing
