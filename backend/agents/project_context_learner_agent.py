"""Classifies durable suite learnings into feature and project contexts."""

import json
from typing import Any, Optional

from .base_agent import BaseAgent


class ProjectContextLearnerAgent(BaseAgent):
    """Maintains scoped feature and project context without run-local state."""

    @property
    def system_prompt(self) -> str:
        return (
            "You maintain two canonical context summaries after a test-suite run. "
            "Return only JSON with `updated_feature_context`, `updated_project_context`, "
            "`feature_change_summary`, and `project_change_summary`. The FEATURE context "
            "is the primary destination: preserve its accurate existing description and "
            "add concise bullet points for new, durable behavior specific to this feature "
            "or flow. Explicit operator corrections are authoritative evidence. The "
            "PROJECT context contains only high-level capabilities or facts useful across "
            "features. Promote at most two short, genuinely new project-level facts; field, "
            "step, selector, validation, navigation-detail, and flow-internal observations "
            "belong only in the feature context. If no global fact was learned, return the "
            "project context unchanged. Preserve accurate existing knowledge and deduplicate "
            "both summaries. Do not infer success from an attempted action. Exclude test "
            "outcomes, run narration, temporary UI/session state, prices, offers, timestamps, "
            "OTPs, passwords, names, emails, phone numbers, addresses, and other supplied "
            "operator values. Correct existing knowledge only when direct evidence or an "
            "operator correction clearly contradicts it. Return complete revised contexts, "
            "not append-only fragments, and keep both concise."
        )

    def parse_response(self, response_text: str) -> Optional[dict]:
        return self.extract_json(response_text)

    def update_contexts(
        self,
        current_project_context: str,
        feature_context: str,
        suite_learning_logs: list[dict[str, Any]],
    ) -> Optional[dict]:
        """Return complete revised feature/project contexts and change summaries."""
        prompt = (
            f"EXISTING PROJECT CONTEXT:\n{current_project_context or '(empty)'}\n\n"
            f"EXISTING FEATURE CONTEXT:\n{feature_context or '(empty)'}\n\n"
            "EXECUTION LOGS FROM THIS SUITE:\n"
            f"{json.dumps(suite_learning_logs, ensure_ascii=False)}\n\n"
            "Return the complete revised feature and project contexts. Feature-specific "
            "discoveries should appear as concise learned-behavior bullets in the feature "
            "context. Project changes should be absent unless the run directly established "
            "a capability or fact that is useful beyond this feature."
        )
        return self.parse_response(self.call_llm(prompt, max_tokens=1536))
