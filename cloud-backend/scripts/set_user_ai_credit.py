#!/usr/bin/env python3
"""Set or add hosted AI credit for one Clariti user by email."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

CLOUD_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(CLOUD_ROOT))

from app.db.mongodb import get_database  # noqa: E402
from app.services.ai_cost_service import usd_to_microusd  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Assign Clariti hosted AI credit.")
    parser.add_argument("email", help="User email address")
    parser.add_argument("usd", help="Dollar amount, for example 2.00")
    parser.add_argument(
        "--add",
        action="store_true",
        help="Add to the current allowance instead of replacing it",
    )
    args = parser.parse_args()

    amount = usd_to_microusd(args.usd)
    if amount < 0:
        parser.error("USD amount cannot be negative")

    update = {"$inc": {"free_credit_microusd": amount}} if args.add else {
        "$set": {"free_credit_microusd": amount}
    }
    result = get_database().users.update_one({"email": args.email.lower()}, update)
    if result.matched_count != 1:
        print(f"No user found for {args.email}", file=sys.stderr)
        return 1

    user = get_database().users.find_one({"email": args.email.lower()}) or {}
    allowance = int(user.get("free_credit_microusd", 0)) / 1_000_000
    spent = int(user.get("spent_microusd", 0)) / 1_000_000
    print(f"{args.email}: allowance=${allowance:.6f}, spent=${spent:.6f}, remaining=${max(allowance-spent, 0):.6f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
