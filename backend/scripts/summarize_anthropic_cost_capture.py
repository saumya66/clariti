#!/usr/bin/env python3
"""Summarize an opt-in real-run Anthropic cost capture."""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from decimal import Decimal
from pathlib import Path
from typing import Any


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.anthropic_cost import decimal_string  # noqa: E402
from services.anthropic_cost_capture import capture_path  # noqa: E402


def _read_events(path: Path) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    for line_number, line in enumerate(
        path.read_text(encoding="utf-8").splitlines(), start=1
    ):
        if not line.strip():
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid JSON on line {line_number}: {exc}") from exc
        events.append(event)
    return events


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Summarize a Clariti real-run AI cost capture."
    )
    parser.add_argument("session_id", help="CLARITI_COST_CAPTURE_SESSION value")
    return parser


def main() -> int:
    args = _build_parser().parse_args()
    path = capture_path(args.session_id)
    if not path.exists():
        print(f"No capture file found: {path}", file=sys.stderr)
        return 2

    events = _read_events(path)
    if not events:
        print(f"Capture file contains no events: {path}", file=sys.stderr)
        return 2

    response_ids = [str(event.get("response_id", "")) for event in events]
    duplicate_count = len(response_ids) - len(set(response_ids))
    calculation_errors = [
        event for event in events if event.get("calculation_error")
    ]
    totals_by_agent: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
    total = Decimal("0")
    usage_totals = defaultdict(int)

    for event in events:
        if event.get("calculation_error"):
            continue
        cost = Decimal(event["cost_usd"]["total_usd"])
        total += cost
        totals_by_agent[str(event.get("agent", "unknown"))] += cost
        for key, value in event.get("usage", {}).items():
            usage_totals[key] += int(value)

    print(f"Capture: {path}")
    print(f"Session: {args.session_id}")
    print(f"Responses: {len(events)}")
    print(f"Unique response IDs: {len(set(response_ids))}")
    print(f"Duplicate response IDs: {duplicate_count}")
    print(f"Calculation errors: {len(calculation_errors)}")
    print("\nCost by agent:")
    for agent, cost in sorted(totals_by_agent.items()):
        print(f"  {agent:<36} ${cost:.8f}")
    print("\nToken totals:")
    for key in (
        "input_tokens",
        "output_tokens",
        "cache_write_5m_tokens",
        "cache_write_1h_tokens",
        "cache_read_tokens",
    ):
        print(f"  {key:<36} {usage_totals[key]}")
    print(f"\nCalculated capture total: ${total:.8f}")

    if duplicate_count or calculation_errors:
        reasons = []
        if duplicate_count:
            reasons.append("duplicate response IDs were found")
        if calculation_errors:
            reasons.append("one or more responses could not be costed")
        print(f"Capture is invalid: {'; '.join(reasons)}.", file=sys.stderr)
        return 1
    print("Capture integrity: OK (one event per unique Anthropic response ID)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
