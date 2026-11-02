import unittest
from unittest.mock import Mock, patch

from services.anthropic_gateway import AnthropicGatewayClient, AnthropicGatewayError


MESSAGE = {
    "id": "msg_test",
    "type": "message",
    "role": "assistant",
    "model": "claude-haiku-4-5-20251001",
    "content": [{"type": "text", "text": "hello", "citations": None}],
    "stop_reason": "end_turn",
    "stop_sequence": None,
    "usage": {
        "input_tokens": 10,
        "output_tokens": 2,
        "cache_creation_input_tokens": 0,
        "cache_read_input_tokens": 0,
    },
}


class AnthropicGatewayTests(unittest.TestCase):
    @patch("services.anthropic_gateway.httpx.post")
    def test_preserves_messages_payload_and_rehydrates_sdk_message(self, post: Mock):
        post.return_value.status_code = 200
        post.return_value.json.return_value = {
            "response": MESSAGE,
            "billing": {"remaining_microusd": 900000},
        }
        client = AnthropicGatewayClient(cloud_token="jwt", agent="Agent", call_site="test")
        response = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=10,
            messages=[{"role": "user", "content": "hello"}],
        )

        sent = post.call_args.kwargs["json"]
        self.assertEqual(sent["mode"], "messages")
        self.assertEqual(sent["payload"]["messages"][0]["content"], "hello")
        self.assertEqual(post.call_args.kwargs["headers"]["Authorization"], "Bearer jwt")
        self.assertEqual(response.id, "msg_test")
        self.assertEqual(response.content[0].text, "hello")
        self.assertEqual(client.last_billing["remaining_microusd"], 900000)

    @patch("services.anthropic_gateway.httpx.post")
    def test_raises_clear_credit_error(self, post: Mock):
        post.return_value.status_code = 402
        post.return_value.json.return_value = {"detail": "Your free AI credit has been used."}
        client = AnthropicGatewayClient(cloud_token="jwt")
        with self.assertRaisesRegex(AnthropicGatewayError, "free AI credit"):
            client.messages.create(model="claude-haiku-4-5", messages=[])

    @patch("services.anthropic_gateway.httpx.post")
    def test_beta_computer_use_blocks_are_rehydrated(self, post: Mock):
        message = dict(MESSAGE)
        message["content"] = [{
            "type": "tool_use",
            "id": "toolu_test",
            "name": "computer",
            "input": {"action": "left_click", "coordinate": [100, 200]},
        }]
        message["stop_reason"] = "tool_use"
        post.return_value.status_code = 200
        post.return_value.json.return_value = {"response": message, "billing": {}}
        client = AnthropicGatewayClient(cloud_token="jwt")

        response = client.beta.messages.create(
            model="claude-haiku-4-5",
            max_tokens=100,
            tools=[],
            messages=[],
            betas=["computer-use-2025-01-24"],
        )

        self.assertEqual(post.call_args.kwargs["json"]["mode"], "beta_messages")
        self.assertEqual(response.content[0].name, "computer")
        self.assertEqual(response.content[0].input["coordinate"], [100, 200])


if __name__ == "__main__":
    unittest.main()
