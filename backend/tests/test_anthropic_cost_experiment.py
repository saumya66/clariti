from __future__ import annotations

import unittest
from decimal import Decimal
from types import SimpleNamespace

from services.anthropic_cost import (
    MODEL_PRICING,
    UsageSnapshot,
    calculate_cost,
    usage_from_response,
)


class AnthropicCostExperimentTests(unittest.TestCase):
    def test_calculates_all_haiku_45_cost_components(self) -> None:
        usage = UsageSnapshot(
            input_tokens=1_000_000,
            output_tokens=1_000_000,
            cache_write_5m_tokens=1_000_000,
            cache_write_1h_tokens=1_000_000,
            cache_read_tokens=1_000_000,
        )

        result = calculate_cost(usage, MODEL_PRICING["claude-haiku-4-5"])

        self.assertEqual(result.input_usd, Decimal("1.00"))
        self.assertEqual(result.output_usd, Decimal("5.00"))
        self.assertEqual(result.cache_write_5m_usd, Decimal("1.25"))
        self.assertEqual(result.cache_write_1h_usd, Decimal("2.00"))
        self.assertEqual(result.cache_read_usd, Decimal("0.10"))
        self.assertEqual(result.total_usd, Decimal("9.35"))

    def test_normalizes_legacy_aggregate_cache_writes_as_five_minute(self) -> None:
        response = SimpleNamespace(
            usage=SimpleNamespace(
                input_tokens=10,
                output_tokens=20,
                cache_creation_input_tokens=30,
                cache_read_input_tokens=40,
            )
        )

        result = usage_from_response(response)

        self.assertEqual(result.cache_write_5m_tokens, 30)
        self.assertEqual(result.cache_write_1h_tokens, 0)

    def test_normalizes_separate_cache_write_ttls(self) -> None:
        response = SimpleNamespace(
            usage=SimpleNamespace(
                input_tokens=10,
                output_tokens=20,
                cache_creation_input_tokens=70,
                cache_read_input_tokens=40,
                cache_creation=SimpleNamespace(
                    ephemeral_5m_input_tokens=30,
                    ephemeral_1h_input_tokens=40,
                ),
            )
        )

        result = usage_from_response(response)

        self.assertEqual(result.cache_write_5m_tokens, 30)
        self.assertEqual(result.cache_write_1h_tokens, 40)

    def test_rejects_negative_usage(self) -> None:
        response = SimpleNamespace(
            usage=SimpleNamespace(
                input_tokens=-1,
                output_tokens=0,
                cache_creation_input_tokens=0,
                cache_read_input_tokens=0,
            )
        )

        with self.assertRaises(ValueError):
            usage_from_response(response)


if __name__ == "__main__":
    unittest.main()
