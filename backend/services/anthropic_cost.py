"""Anthropic usage normalization and deterministic USD cost calculation."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from decimal import Decimal
from typing import Any


TOKENS_PER_MILLION = Decimal("1000000")


@dataclass(frozen=True)
class ModelPricing:
    """USD prices per million tokens for one Claude model."""

    input: Decimal
    output: Decimal
    cache_write_5m: Decimal
    cache_write_1h: Decimal
    cache_read: Decimal
    source: str
    verified_on: str


HAIKU_45_PRICING = ModelPricing(
    input=Decimal("1.00"),
    output=Decimal("5.00"),
    cache_write_5m=Decimal("1.25"),
    cache_write_1h=Decimal("2.00"),
    cache_read=Decimal("0.10"),
    source="https://platform.claude.com/docs/en/models/haiku-4-5/overview",
    verified_on="2026-10-31",
)


# Keep aliases and pinned snapshots together. Anthropic can receive an alias but
# return the pinned snapshot in response.model.
MODEL_PRICING: dict[str, ModelPricing] = {
    "claude-haiku-4-5": HAIKU_45_PRICING,
    "claude-haiku-4-5-20251001": HAIKU_45_PRICING,
}


@dataclass(frozen=True)
class UsageSnapshot:
    input_tokens: int = 0
    output_tokens: int = 0
    cache_write_5m_tokens: int = 0
    cache_write_1h_tokens: int = 0
    cache_read_tokens: int = 0


@dataclass(frozen=True)
class CostBreakdown:
    input_usd: Decimal
    output_usd: Decimal
    cache_write_5m_usd: Decimal
    cache_write_1h_usd: Decimal
    cache_read_usd: Decimal
    total_usd: Decimal

    def json_dict(self) -> dict[str, str]:
        return {key: decimal_string(value) for key, value in asdict(self).items()}


def decimal_string(value: Decimal) -> str:
    """Return a non-scientific decimal string without losing precision."""
    return format(value, "f")


def pricing_rates_json(pricing: ModelPricing) -> dict[str, str]:
    return {
        "input": decimal_string(pricing.input),
        "output": decimal_string(pricing.output),
        "cache_write_5m": decimal_string(pricing.cache_write_5m),
        "cache_write_1h": decimal_string(pricing.cache_write_1h),
        "cache_read": decimal_string(pricing.cache_read),
    }


def pricing_for_models(response_model: str, requested_model: str) -> ModelPricing:
    pricing = MODEL_PRICING.get(response_model) or MODEL_PRICING.get(requested_model)
    if pricing is None:
        raise ValueError(
            "No verified pricing configured for response model "
            f"{response_model!r} or requested model {requested_model!r}"
        )
    return pricing


def _non_negative_int(value: Any) -> int:
    if value is None:
        return 0
    parsed = int(value)
    if parsed < 0:
        raise ValueError(f"Token usage cannot be negative: {parsed}")
    return parsed


def usage_from_response(response: Any) -> UsageSnapshot:
    """Normalize Anthropic usage, including separate 5m/1h cache writes."""
    usage = response.usage
    cache_creation = getattr(usage, "cache_creation", None)
    total_cache_write = _non_negative_int(
        getattr(usage, "cache_creation_input_tokens", 0)
    )

    if cache_creation is None:
        # Clariti uses the default five-minute ephemeral cache. Older SDK/API
        # response shapes expose only the aggregate cache-write count.
        cache_write_5m = total_cache_write
        cache_write_1h = 0
    else:
        cache_write_5m = _non_negative_int(
            getattr(cache_creation, "ephemeral_5m_input_tokens", 0)
        )
        cache_write_1h = _non_negative_int(
            getattr(cache_creation, "ephemeral_1h_input_tokens", 0)
        )
        categorized_total = cache_write_5m + cache_write_1h
        if categorized_total < total_cache_write:
            # Treat uncategorized writes as 5m rather than dropping billed
            # usage. This matches Clariti's current cache configuration.
            cache_write_5m += total_cache_write - categorized_total
        elif categorized_total > total_cache_write and total_cache_write:
            raise ValueError(
                "Cache-write token categories exceed the reported aggregate"
            )

    return UsageSnapshot(
        input_tokens=_non_negative_int(getattr(usage, "input_tokens", 0)),
        output_tokens=_non_negative_int(getattr(usage, "output_tokens", 0)),
        cache_write_5m_tokens=cache_write_5m,
        cache_write_1h_tokens=cache_write_1h,
        cache_read_tokens=_non_negative_int(
            getattr(usage, "cache_read_input_tokens", 0)
        ),
    )


def calculate_cost(usage: UsageSnapshot, pricing: ModelPricing) -> CostBreakdown:
    """Calculate a Claude request's USD cost from its returned token usage."""

    def component(tokens: int, rate: Decimal) -> Decimal:
        return Decimal(tokens) * rate / TOKENS_PER_MILLION

    input_usd = component(usage.input_tokens, pricing.input)
    output_usd = component(usage.output_tokens, pricing.output)
    cache_write_5m_usd = component(
        usage.cache_write_5m_tokens, pricing.cache_write_5m
    )
    cache_write_1h_usd = component(
        usage.cache_write_1h_tokens, pricing.cache_write_1h
    )
    cache_read_usd = component(usage.cache_read_tokens, pricing.cache_read)
    total = (
        input_usd
        + output_usd
        + cache_write_5m_usd
        + cache_write_1h_usd
        + cache_read_usd
    )
    return CostBreakdown(
        input_usd=input_usd,
        output_usd=output_usd,
        cache_write_5m_usd=cache_write_5m_usd,
        cache_write_1h_usd=cache_write_1h_usd,
        cache_read_usd=cache_read_usd,
        total_usd=total,
    )
