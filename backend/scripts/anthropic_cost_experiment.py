#!/usr/bin/env python3
"""Run a small Anthropic cost-calibration experiment for Clariti.

This utility is deliberately separate from Clariti's normal execution flow. It
sends representative requests, calculates their cost from the usage returned
in the same Anthropic response, and writes a local report that can be compared
with the Claude Console dashboard.

Preview without spending:

    backend/.venv/bin/python backend/scripts/anthropic_cost_experiment.py

Run the experiment:

    backend/.venv/bin/python backend/scripts/anthropic_cost_experiment.py --execute
"""

from __future__ import annotations

import argparse
import base64
import io
import json
import os
import sys
from dataclasses import asdict
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any, Callable, Iterable

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import anthropic
from dotenv import load_dotenv
from PIL import Image, ImageDraw

from services.anthropic_cost import (
    MODEL_PRICING,
    calculate_cost,
    decimal_string,
    pricing_for_models,
    pricing_rates_json,
    usage_from_response,
)

DEFAULT_MODEL = "claude-haiku-4-5"
COMPUTER_USE_BETA = "computer-use-2025-01-24"
CACHE_CALIBRATION_QUESTION = "Reply with exactly: cache calibration complete"


def _synthetic_screenshot() -> str:
    """Create a harmless screenshot-like image without using user data."""
    image = Image.new("RGB", (1280, 720), "#f3f4f6")
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 1280, 72), fill="#111827")
    draw.rectangle((56, 122, 390, 650), fill="#ffffff", outline="#d1d5db", width=3)
    draw.rectangle((430, 122, 1224, 650), fill="#ffffff", outline="#d1d5db", width=3)
    draw.rectangle((480, 190, 1160, 250), fill="#e5e7eb")
    draw.rectangle((480, 290, 820, 342), fill="#dbeafe")
    draw.rectangle((480, 382, 1120, 434), fill="#e5e7eb")
    draw.rectangle((480, 520, 710, 584), fill="#2563eb")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("ascii")


def _cacheable_context() -> str:
    # Haiku 4.5 requires at least 4,096 cacheable tokens. This deterministic
    # text is intentionally comfortably above that threshold.
    sentence = (
        "Clariti is a desktop quality-assurance assistant evaluating a stable "
        "cost-calibration fixture with no private user information. "
    )
    return sentence * 320


def _text_request(client: anthropic.Anthropic, model: str) -> Any:
    return client.messages.create(
        model=model,
        max_tokens=64,
        system="You are participating in a deterministic API cost calibration.",
        messages=[{
            "role": "user",
            "content": "Reply with exactly: text calibration complete",
        }],
        temperature=0,
    )


def _image_request(client: anthropic.Anthropic, model: str) -> Any:
    return client.messages.create(
        model=model,
        max_tokens=64,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": _synthetic_screenshot(),
                    },
                },
                {
                    "type": "text",
                    "text": "Describe this synthetic interface in one short sentence.",
                },
            ],
        }],
        temperature=0,
    )


def _computer_use_request(client: anthropic.Anthropic, model: str) -> Any:
    return client.beta.messages.create(
        model=model,
        max_tokens=128,
        system=(
            "This is a cost calibration. Inspect the supplied synthetic screen, "
            "describe it briefly, and do not take an action."
        ),
        tools=[{
            "type": "computer_20250124",
            "name": "computer",
            "display_width_px": 1280,
            "display_height_px": 720,
        }],
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": _synthetic_screenshot(),
                    },
                },
                {
                    "type": "text",
                    "text": "Briefly describe the visible synthetic interface.",
                },
            ],
        }],
        betas=[COMPUTER_USE_BETA],
        cache_control={"type": "ephemeral"},
    )


def _cache_request(
    client: anthropic.Anthropic,
    model: str,
    question: str,
) -> Any:
    return client.messages.create(
        model=model,
        max_tokens=64,
        system=_cacheable_context(),
        cache_control={"type": "ephemeral"},
        messages=[{"role": "user", "content": question}],
        temperature=0,
    )


def _response_model(response: Any, requested_model: str) -> str:
    return str(getattr(response, "model", None) or requested_model)


def _response_id(response: Any) -> str:
    return str(getattr(response, "id", "unknown"))


def _run_case(
    name: str,
    request: Callable[[], Any],
    requested_model: str,
) -> dict[str, Any]:
    started_at = datetime.now(timezone.utc)
    response = request()
    completed_at = datetime.now(timezone.utc)
    billed_model = _response_model(response, requested_model)
    pricing = pricing_for_models(billed_model, requested_model)
    usage = usage_from_response(response)
    cost = calculate_cost(usage, pricing)
    result = {
        "case": name,
        "request_id": _response_id(response),
        "requested_model": requested_model,
        "response_model": billed_model,
        "started_at": started_at.isoformat(),
        "completed_at": completed_at.isoformat(),
        "usage": asdict(usage),
        "cost_usd": cost.json_dict(),
    }
    print(
        f"{name:<20} request={result['request_id']} "
        f"cost=${cost.total_usd:.8f}"
    )
    return result


def _default_output_path() -> Path:
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return BACKEND_DIR / "data" / "cost-experiments" / f"anthropic-{timestamp}.json"


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Compare locally calculated Anthropic costs with Claude Console."
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually send five billable requests. Without this flag, only preview.",
    )
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument(
        "--output",
        type=Path,
        help="Report path (default: ignored backend/data/cost-experiments directory).",
    )
    return parser


def main(argv: Iterable[str] | None = None) -> int:
    args = _build_parser().parse_args(list(argv) if argv is not None else None)
    pricing = MODEL_PRICING.get(args.model)
    if pricing is None:
        supported = ", ".join(sorted(MODEL_PRICING))
        print(
            f"No verified pricing is configured for {args.model!r}. Supported: {supported}",
            file=sys.stderr,
        )
        return 2

    print("Anthropic cost experiment")
    print(f"Model: {args.model}")
    print(f"Pricing (USD / million tokens): {pricing_rates_json(pricing)}")
    print(f"Pricing source: {pricing.source}")
    print("Cases: text, image, computer use, cache write, cache read")

    if not args.execute:
        print("\nPreview only; no API requests were sent.")
        print("Re-run with --execute after recording the Claude Console baseline.")
        return 0

    load_dotenv(BACKEND_DIR / ".env")
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        print(
            "ANTHROPIC_API_KEY is not set in the environment or backend/.env.",
            file=sys.stderr,
        )
        return 2

    client = anthropic.Anthropic(api_key=api_key)
    experiment_started_at = datetime.now(timezone.utc)
    cases: list[dict[str, Any]] = []

    # Run sequentially. The cache entry must exist before the read request.
    cases.append(_run_case("text", lambda: _text_request(client, args.model), args.model))
    cases.append(_run_case("image", lambda: _image_request(client, args.model), args.model))
    cases.append(
        _run_case(
            "computer_use",
            lambda: _computer_use_request(client, args.model),
            args.model,
        )
    )
    cases.append(
        _run_case(
            "cache_write",
            lambda: _cache_request(
                client,
                args.model,
                CACHE_CALIBRATION_QUESTION,
            ),
            args.model,
        )
    )
    cases.append(
        _run_case(
            "cache_read",
            lambda: _cache_request(
                client,
                args.model,
                CACHE_CALIBRATION_QUESTION,
            ),
            args.model,
        )
    )

    total = sum(
        (Decimal(case["cost_usd"]["total_usd"]) for case in cases),
        Decimal("0"),
    )
    report = {
        "experiment_started_at": experiment_started_at.isoformat(),
        "experiment_completed_at": datetime.now(timezone.utc).isoformat(),
        "model": args.model,
        "pricing_verified_on": pricing.verified_on,
        "pricing_source": pricing.source,
        "pricing_usd_per_million_tokens": pricing_rates_json(pricing),
        "cases": cases,
        "calculated_total_usd": decimal_string(total),
        "dashboard_comparison": {
            "baseline_usd": None,
            "updated_usd": None,
            "observed_delta_usd": None,
        },
    }
    output_path = (args.output or _default_output_path()).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    print(f"\nCalculated experiment total: ${total:.8f}")
    print(f"Local report: {output_path}")
    print("Compare this total with the experiment key's Claude Console cost increase.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
