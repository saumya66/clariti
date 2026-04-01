"""
Test Planner Agent

Takes a FeatureContext (extracted from images, documents, videos, text)
and generates human-readable test cases covering the feature.
"""

from typing import Any, Optional, List
from .base_agent import BaseAgent


class TestPlannerAgent(BaseAgent):
    """
    Agent that analyzes feature context and generates comprehensive test cases.
    
    Input: FeatureContext (UI elements, requirements, user notes, flow steps)
    Output: List of test cases in natural language
    """
    
    @property
    def system_prompt(self) -> str:
        return """You are a senior QA engineer. Given context about a feature (UI screenshots, requirements, user notes), generate comprehensive test cases.

Respond ONLY with valid JSON in this exact format:
{
  "feature_summary": "Brief summary of the feature being tested",
  "test_cases": [
    {
      "test_key": "TC-001",
      "title": "Verify user can add product to bag",
      "goal": "Confirm that a logged-in user can successfully add an in-stock product to their bag",
      "description": "Tests the primary Add to Bag flow on the Product Details Page",
      "category": "functional",
      "priority": "critical",
      "expected_result": "Product is added to bag, success toast appears, and bag count increments by 1"
    }
  ],
  "coverage_notes": "Additional notes about test coverage or missing information"
}

Field rules:
- test_key: sequential identifier like TC-001, TC-002, etc.
- title: concise name for the test (max 80 chars)
- goal: one sentence describing what this test validates
- description: optional extra context about the test scope (can be null)
- category: one of — functional, negative, ui, edge_case, accessibility
- priority: one of — critical, high, medium, low
- expected_result: what the system should do/show after the test action

Coverage requirements — always generate tests for:
- Happy paths (normal user flows)
- Edge cases (empty states, boundary values)
- Negative tests (invalid input, error handling)
- UI verification (elements visible, correct labels)

Be thorough but practical. Generate 5-10 test cases depending on feature complexity."""

    def parse_response(self, response_text: str) -> Any:
        """Parse the JSON response from Gemini."""
        return self.extract_json(response_text)
    
    def generate_tests(self, context_summary: str, user_feedback: str = "") -> Optional[dict]:
        """
        Generate test cases from a feature context summary.
        
        Args:
            context_summary: A text summary of the feature context including
                            UI elements, requirements, user notes, etc.
            user_feedback: Optional user feedback to steer test generation.
        
        Returns:
            Dict containing test_cases list or None if generation failed.
        """
        feedback_section = f"\n\n--- USER FEEDBACK (apply this to improve the tests) ---\n{user_feedback}\n--- END FEEDBACK ---" if user_feedback else ""
        prompt = f"""Analyze this feature context and generate comprehensive test cases:

--- FEATURE CONTEXT ---
{context_summary}
--- END CONTEXT ---{feedback_section}

Generate test cases that thoroughly cover this feature."""

        try:
            response = self.call_llm(
                user_prompt=prompt,
                max_tokens=4096
            )
            return self.parse_response(response)
        except Exception as e:
            print(f"[TestPlannerAgent] Error generating tests: {e}")
            return None
    
    def generate_from_feature_context(self, ctx: dict) -> Optional[dict]:
        """
        Generate test cases from a context dict.

        Supports two shapes:

        1. Local flow (ContextBuilder): dict has ``items`` list with extracted AI data
           per image/document/video/text.

        2. Cloud flow: dict has ``context_summary`` (feature-level AI summary) and
           optionally ``project_context`` (project-level summary). ``items`` is empty
           or absent.
        """
        summary_parts: List[str] = []

        summary_parts.append(f"Feature: {ctx.get('name', 'Unknown')}")
        if ctx.get('description'):
            summary_parts.append(f"Description: {ctx['description']}")

        # ── Cloud path: pre-computed summaries ──────────────────────────────
        if ctx.get('project_context'):
            summary_parts.append(f"\n--- Project Context ---\n{ctx['project_context']}")

        if ctx.get('context_summary'):
            summary_parts.append(f"\n--- Feature Context ---\n{ctx['context_summary']}")

        # ── Local path: raw extracted items ─────────────────────────────────
        for item in ctx.get('items', []):
            item_type = item.get('type', '')
            source = item.get('source_name', '')
            extracted = item.get('extracted', {})

            if item_type == 'image':
                summary_parts.append(f"\n--- UI Screen: {source} ---")
                if extracted.get('screen_type'):
                    summary_parts.append(f"Screen Type: {extracted['screen_type']}")
                if extracted.get('description'):
                    summary_parts.append(f"Description: {extracted['description']}")
                if extracted.get('elements'):
                    elements_str = ", ".join([
                        f"{e.get('type', 'element')}:{e.get('label', 'unlabeled')}"
                        for e in extracted['elements'][:20]
                    ])
                    summary_parts.append(f"UI Elements: {elements_str}")
                if extracted.get('text_content'):
                    text_str = ", ".join(extracted['text_content'][:10])
                    summary_parts.append(f"Text Content: {text_str}")

            elif item_type == 'document':
                summary_parts.append(f"\n--- Requirements: {source} ---")
                if extracted.get('feature_name'):
                    summary_parts.append(f"Feature: {extracted['feature_name']}")
                if extracted.get('summary'):
                    summary_parts.append(f"Summary: {extracted['summary']}")
                if extracted.get('requirements'):
                    for req in extracted['requirements'][:10]:
                        summary_parts.append(f"- [{req.get('priority', 'should')}] {req.get('text', '')}")
                if extracted.get('user_flows'):
                    for flow in extracted['user_flows'][:3]:
                        summary_parts.append(f"Flow '{flow.get('name', '')}': {' -> '.join(flow.get('steps', []))}")

            elif item_type == 'video':
                summary_parts.append(f"\n--- User Flow Recording: {source} ---")
                if extracted.get('summary'):
                    summary_parts.append(f"Flow Summary: {extracted['summary']}")
                if extracted.get('steps'):
                    for step in extracted['steps'][:10]:
                        summary_parts.append(f"- {step.get('action', 'action')}: {step.get('description', '')}")

            elif item_type == 'text':
                summary_parts.append("\n--- User Notes ---")
                if extracted.get('text'):
                    summary_parts.append(extracted['text'])

        return self.generate_tests("\n".join(summary_parts), user_feedback=ctx.get("user_feedback", ""))
