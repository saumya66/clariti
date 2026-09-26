"""Pure helpers for preparing and persisting scoped execution learnings."""

from typing import Any, Callable, Optional


MAX_STEPS_PER_TEST = 60
MAX_TEXT_CHARS = 1200
MAX_OPERATOR_CORRECTIONS_PER_TEST = 20


def _compact_text(value: Any) -> str:
    text = str(value or "").strip()
    if len(text) <= MAX_TEXT_CHARS:
        return text
    return f"{text[:MAX_TEXT_CHARS]}…"


def _select_steps(steps: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if len(steps) <= MAX_STEPS_PER_TEST:
        return steps
    half = MAX_STEPS_PER_TEST // 2
    return steps[:half] + steps[-half:]


def build_suite_learning_log(
    *,
    test_case: dict[str, Any],
    status: str,
    conclusion: str,
    steps: list[dict[str, Any]],
    operator_corrections: Optional[list[str]] = None,
) -> dict[str, Any]:
    """Build a bounded, text-only record for feature/project context learning."""
    compact_steps = [
        {
            "step_number": step.get("step_number"),
            "action": _compact_text(step.get("action")),
            "description": _compact_text(
                step.get("description") or step.get("reasoning")
            ),
            "success": bool(step.get("success")),
            "error": _compact_text(step.get("error")) or None,
        }
        for step in _select_steps(steps)
    ]
    return {
        "test_id": str(test_case.get("id") or test_case.get("test_key") or ""),
        "test_key": _compact_text(test_case.get("test_key")),
        "title": _compact_text(test_case.get("title")),
        "goal": _compact_text(test_case.get("goal")),
        "expected_result": _compact_text(test_case.get("expected_result")),
        "status": status,
        "conclusion": _compact_text(conclusion),
        "operator_corrections": [
            _compact_text(correction)
            for correction in (operator_corrections or [])[
                -MAX_OPERATOR_CORRECTIONS_PER_TEST:
            ]
            if str(correction or "").strip()
        ],
        "steps": compact_steps,
    }


def should_run_context_learning(
    *,
    logs: list[dict[str, Any]],
    aborted: bool,
    feature_id: Optional[str],
    cloud_token: Optional[str],
) -> bool:
    """Return whether a completed suite has enough data to update its feature."""
    if aborted or not feature_id or not cloud_token:
        return False
    return any(
        log.get("conclusion")
        or log.get("steps")
        or log.get("operator_corrections")
        for log in logs
    )


def learn_and_update_contexts(
    *,
    learner: Any,
    update_feature: Callable[..., Optional[dict]],
    update_project: Callable[..., Optional[dict]],
    feature_id: str,
    project_id: Optional[str],
    cloud_token: str,
    project_context: str,
    feature_context: str,
    logs: list[dict[str, Any]],
) -> dict[str, Any]:
    """Revise feature context first, then persist any global project refinement."""
    learner_result = learner.update_contexts(
        project_context,
        feature_context,
        logs,
    ) or {}
    updated_feature_context = str(
        learner_result.get("updated_feature_context") or ""
    ).strip()
    if not updated_feature_context:
        raise ValueError("Learner returned no updated feature context")

    # Never erase established project knowledge because a model omitted the field.
    raw_project_context = learner_result.get("updated_project_context")
    updated_project_context = (
        str(raw_project_context).strip()
        if raw_project_context is not None
        else project_context.strip()
    )
    if project_context.strip() and not updated_project_context:
        updated_project_context = project_context.strip()

    feature_changed = updated_feature_context != feature_context.strip()
    project_changed = updated_project_context != project_context.strip()
    feature_change_summary = str(
        learner_result.get("feature_change_summary") or ""
    ).strip()
    project_change_summary = str(
        learner_result.get("project_change_summary") or ""
    ).strip()

    if feature_changed:
        updated_feature = update_feature(
            feature_id,
            token=cloud_token,
            context_summary=updated_feature_context,
        )
        if not updated_feature:
            raise RuntimeError("Cloud feature context update failed")

    project_warning = ""
    project_updated = False
    if project_changed:
        if not project_id:
            project_warning = "Feature context updated, but project ID was unavailable."
        else:
            try:
                updated_project = update_project(
                    project_id,
                    token=cloud_token,
                    context_summary=updated_project_context,
                )
                if not updated_project:
                    raise RuntimeError("Cloud project context update failed")
                project_updated = True
            except Exception as exc:
                feature_state = (
                    "Feature context was updated"
                    if feature_changed
                    else "Feature context was already up to date"
                )
                project_warning = (
                    f"{feature_state}, but project context could not be updated: {exc}"
                )

    summaries = [summary for summary in (
        feature_change_summary if feature_changed else "",
        project_change_summary if project_updated else "",
    ) if summary]

    return {
        "updated_feature_context": updated_feature_context,
        "updated_project_context": updated_project_context,
        "feature_updated": feature_changed,
        "project_updated": project_updated,
        "feature_change_summary": feature_change_summary,
        "project_change_summary": project_change_summary,
        "change_summary": " ".join(summaries),
        "warning": project_warning,
    }
