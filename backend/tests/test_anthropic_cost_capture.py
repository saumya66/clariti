from __future__ import annotations

import json
import os
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from services import anthropic_cost_capture


def _response(response_id: str = "msg_test_123") -> SimpleNamespace:
    return SimpleNamespace(
        id=response_id,
        model="claude-haiku-4-5-20251001",
        usage=SimpleNamespace(
            input_tokens=100,
            output_tokens=20,
            cache_creation_input_tokens=0,
            cache_read_input_tokens=0,
        ),
        content=[{"type": "text", "text": "sensitive response not recorded"}],
    )


class AnthropicCostCaptureTests(unittest.TestCase):
    def test_disabled_capture_writes_nothing(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            with (
                patch.dict(os.environ, {}, clear=True),
                patch.object(anthropic_cost_capture, "CAPTURE_ROOT", Path(directory)),
            ):
                result = anthropic_cost_capture.record_anthropic_response(
                    _response(),
                    agent="TestAgent",
                    call_site="test",
                    requested_model="claude-haiku-4-5",
                )

            self.assertIsNone(result)
            self.assertEqual(list(Path(directory).glob("*")), [])

    def test_enabled_capture_writes_one_redacted_event_and_deduplicates(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            capture_root = Path(directory)
            environment = {
                "CLARITI_CAPTURE_AI_COSTS": "true",
                "CLARITI_COST_CAPTURE_SESSION": "test-session",
            }
            with (
                patch.dict(os.environ, environment, clear=True),
                patch.object(anthropic_cost_capture, "CAPTURE_ROOT", capture_root),
            ):
                for _ in range(2):
                    anthropic_cost_capture.record_anthropic_response(
                        _response(),
                        agent="TestAgent",
                        call_site="test",
                        requested_model="claude-haiku-4-5",
                        call_number=1,
                    )

            path = capture_root / "test-session.jsonl"
            lines = path.read_text(encoding="utf-8").splitlines()
            self.assertEqual(len(lines), 1)
            event = json.loads(lines[0])
            self.assertEqual(event["response_id"], "msg_test_123")
            self.assertEqual(event["agent"], "TestAgent")
            self.assertEqual(event["usage"]["input_tokens"], 100)
            self.assertEqual(event["cost_usd"]["total_usd"], "0.0002")
            self.assertNotIn("content", event)
            self.assertNotIn("sensitive response not recorded", lines[0])

    def test_missing_session_does_not_write_or_raise(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            environment = {"CLARITI_CAPTURE_AI_COSTS": "true"}
            with (
                patch.dict(os.environ, environment, clear=True),
                patch.object(anthropic_cost_capture, "CAPTURE_ROOT", Path(directory)),
            ):
                result = anthropic_cost_capture.record_anthropic_response(
                    _response("msg_missing_session"),
                    agent="TestAgent",
                    call_site="test",
                    requested_model="claude-haiku-4-5",
                )

            self.assertIsNone(result)
            self.assertEqual(list(Path(directory).glob("*")), [])

    def test_unknown_model_writes_an_explicit_error_event(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            capture_root = Path(directory)
            environment = {
                "CLARITI_CAPTURE_AI_COSTS": "true",
                "CLARITI_COST_CAPTURE_SESSION": "unknown-model",
            }
            response = _response("msg_unknown_model")
            response.model = "claude-unknown-model"
            with (
                patch.dict(os.environ, environment, clear=True),
                patch.object(anthropic_cost_capture, "CAPTURE_ROOT", capture_root),
            ):
                event = anthropic_cost_capture.record_anthropic_response(
                    response,
                    agent="TestAgent",
                    call_site="test",
                    requested_model="claude-unknown-model",
                )

            self.assertIsNotNone(event)
            self.assertIn("No verified pricing", event["calculation_error"])
            lines = (capture_root / "unknown-model.jsonl").read_text(encoding="utf-8")
            self.assertIn("msg_unknown_model", lines)
            self.assertNotIn('"cost_usd"', lines)


if __name__ == "__main__":
    unittest.main()
