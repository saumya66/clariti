import unittest

from app.services.ai_cost_service import calculate_cost, usd_to_microusd


class AICostServiceTests(unittest.TestCase):
    def test_validated_haiku_price_and_microdollar_rounding(self):
        cost, usage, pricing = calculate_cost(
            "claude-haiku-4-5",
            {
                "input_tokens": 1_000_000,
                "output_tokens": 100_000,
                "cache_creation": {
                    "ephemeral_5m_input_tokens": 200_000,
                    "ephemeral_1h_input_tokens": 50_000,
                },
                "cache_read_input_tokens": 500_000,
            },
        )
        self.assertEqual(cost, 1_900_000)
        self.assertEqual(usage["cache_read_tokens"], 500_000)
        self.assertEqual(pricing["output_usd_per_mtok"], "5.00")

    def test_usd_to_microusd_is_exact(self):
        self.assertEqual(usd_to_microusd("2.50"), 2_500_000)
        self.assertEqual(usd_to_microusd("0.0000005"), 1)


if __name__ == "__main__":
    unittest.main()
