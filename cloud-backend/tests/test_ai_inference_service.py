import unittest
from datetime import datetime, timezone
from unittest.mock import Mock, patch

import mongomock
from bson import ObjectId

from app.services.ai_inference_service import AIInferenceError, run_inference


class FakeResponse:
    def __init__(self, response_id="msg_test"):
        self.response_id = response_id

    def model_dump(self, mode="json"):
        return {
            "id": self.response_id,
            "type": "message",
            "role": "assistant",
            "model": "claude-haiku-4-5-20251001",
            "content": [{"type": "text", "text": "ok"}],
            "stop_reason": "end_turn",
            "stop_sequence": None,
            "usage": {
                "input_tokens": 100,
                "output_tokens": 20,
                "cache_creation_input_tokens": 0,
                "cache_read_input_tokens": 0,
            },
        }


class AIInferenceServiceTests(unittest.TestCase):
    def setUp(self):
        self.db = mongomock.MongoClient().clariti
        self.user_id = ObjectId()
        self.db.users.insert_one({
            "_id": self.user_id,
            "email": "tester@example.com",
            "free_credit_microusd": 1_000_000,
            "spent_microusd": 0,
            "ai_access_status": "active",
            "ai_request_active": False,
            "ai_request_started_at": None,
        })
        self.db.ai_usage_events.create_index("anthropic_response_id", unique=True)

    def _run(self, response_id="msg_test"):
        fake_client = Mock()
        fake_client.messages.create.return_value = FakeResponse(response_id)
        with (
            patch("app.services.ai_inference_service.settings.ANTHROPIC_API_KEY", "server-key"),
            patch("app.services.ai_inference_service.anthropic.Anthropic", return_value=fake_client),
        ):
            result = run_inference(
                self.db,
                user_id=str(self.user_id),
                mode="messages",
                payload={"model": "claude-haiku-4-5", "messages": []},
                agent="TestAgent",
                call_site="test",
                call_number=1,
            )
        return result, fake_client

    def test_success_charges_actual_cost_writes_ledger_and_releases_lease(self):
        result, fake_client = self._run()
        # 100 input tokens ($0.0001) + 20 output tokens ($0.0001) = 200 micro-USD.
        self.assertEqual(result["charged_microusd"], 200)
        self.assertEqual(result["billing"]["spent_microusd"], 200)
        self.assertEqual(self.db.ai_usage_events.count_documents({}), 1)
        user = self.db.users.find_one({"_id": self.user_id})
        self.assertEqual(user["spent_microusd"], 200)
        self.assertFalse(user["ai_request_active"])
        fake_client.messages.create.assert_called_once()

    def test_exhausted_credit_is_blocked_before_anthropic(self):
        self.db.users.update_one(
            {"_id": self.user_id},
            {"$set": {"spent_microusd": 1_000_000}},
        )
        with patch("app.services.ai_inference_service.settings.ANTHROPIC_API_KEY", "server-key"):
            with self.assertRaises(AIInferenceError) as raised:
                run_inference(
                    self.db,
                    user_id=str(self.user_id),
                    mode="messages",
                    payload={"model": "claude-haiku-4-5", "messages": []},
                    agent="TestAgent",
                    call_site="test",
                    call_number=None,
                )
        self.assertEqual(raised.exception.status_code, 402)
        self.assertEqual(self.db.ai_usage_events.count_documents({}), 0)

    def test_global_pause_and_active_lease_are_enforced(self):
        self.db.system_settings.insert_one({"_id": "ai", "ai_requests_enabled": False, "disabled_reason": "Paused"})
        with patch("app.services.ai_inference_service.settings.ANTHROPIC_API_KEY", "server-key"):
            with self.assertRaises(AIInferenceError) as paused:
                run_inference(
                    self.db, user_id=str(self.user_id), mode="messages",
                    payload={"model": "claude-haiku-4-5", "messages": []},
                    agent="TestAgent", call_site="test", call_number=None,
                )
        self.assertEqual(paused.exception.status_code, 503)

        self.db.system_settings.update_one({"_id": "ai"}, {"$set": {"ai_requests_enabled": True}})
        self.db.users.update_one(
            {"_id": self.user_id},
            {"$set": {"ai_request_active": True, "ai_request_started_at": datetime.now(timezone.utc)}},
        )
        with patch("app.services.ai_inference_service.settings.ANTHROPIC_API_KEY", "server-key"):
            with self.assertRaises(AIInferenceError) as busy:
                run_inference(
                    self.db, user_id=str(self.user_id), mode="messages",
                    payload={"model": "claude-haiku-4-5", "messages": []},
                    agent="TestAgent", call_site="test", call_number=None,
                )
        self.assertEqual(busy.exception.status_code, 409)

    def test_duplicate_response_id_is_not_charged_twice(self):
        self._run("msg_duplicate")
        with self.assertRaises(AIInferenceError) as duplicate:
            self._run("msg_duplicate")
        self.assertEqual(duplicate.exception.status_code, 409)
        user = self.db.users.find_one({"_id": self.user_id})
        self.assertEqual(user["spent_microusd"], 200)
        self.assertFalse(user["ai_request_active"])


if __name__ == "__main__":
    unittest.main()
