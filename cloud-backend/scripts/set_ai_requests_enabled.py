#!/usr/bin/env python3
"""Enable or pause every hosted Clariti AI request."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

CLOUD_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(CLOUD_ROOT))

from app.db.mongodb import get_database  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Control the Clariti AI kill switch.")
    parser.add_argument("state", choices=("on", "off"))
    parser.add_argument("--reason", default=None)
    args = parser.parse_args()
    enabled = args.state == "on"
    get_database().system_settings.update_one(
        {"_id": "ai"},
        {"$set": {"ai_requests_enabled": enabled, "disabled_reason": None if enabled else args.reason}},
        upsert=True,
    )
    print(f"Hosted AI requests are {'enabled' if enabled else 'paused'}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
