#!/usr/bin/env python3
"""measure_context.py — token budget tracking with warnings (never aborts agents).

Usage:
    python additional-modules/scripts/measure_context.py --tokens <current_count>
    python additional-modules/scripts/measure_context.py --status
    python additional-modules/scripts/measure_context.py --tokens 0 --start-session
    python additional-modules/scripts/measure_context.py --archive-session --slug <slug> --tokens <count>

Rules:
    - Ceiling: 28000 tokens (warn-only — always exits 0 so agents keep working).
    - Warning at 18k; critical at 25.2k (90% of ceiling).
    - Updates context_budget.json with current usage.

Paths resolve relative to the current working directory (project root).
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone

_REPO_ROOT = os.getcwd()

DEFAULT_BUDGET = "additional-modules/buildplan/context_budget.json"
DEFAULT_SESSIONS = "additional-modules/work-log/sessions"

HARD_LIMIT = 28000
WARN_THRESHOLD = 18000
CRITICAL_THRESHOLD = 25200


def _resolve(path: str) -> str:
    if os.path.isabs(path):
        return path
    return os.path.join(_REPO_ROOT, path)


def load_budget(path: str) -> dict:
    with open(_resolve(path), "r", encoding="utf-8") as f:
        return json.load(f)


def save_budget(path: str, budget: dict) -> None:
    resolved = _resolve(path)
    os.makedirs(os.path.dirname(resolved), exist_ok=True)
    tmp = resolved + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(budget, f, indent=2, ensure_ascii=False)
        f.write("\n")
    os.replace(tmp, resolved)


def default_budget() -> dict:
    return {
        "hardLimit": HARD_LIMIT,
        "currentUsage": 0,
        "remaining": HARD_LIMIT,
        "sessionStart": None,
        "sessionEnd": None,
        "history": [],
    }


def print_status(budget: dict) -> None:
    usage = budget.get("currentUsage", 0)
    limit = budget.get("hardLimit", HARD_LIMIT)
    remaining = budget.get("remaining", limit - usage)
    pct = (usage / limit * 100) if limit else 0
    print(f"Budget: {usage:,} / {limit:,} tokens ({pct:.0f}%)")
    print(f"Remaining: {remaining:,}")
    if budget.get("sessionStart"):
        print(f"Session started: {budget['sessionStart']}")
    if budget.get("sessionEnd"):
        print(f"Session ended: {budget['sessionEnd']}")


def archive_session(slug: str, usage: int, budget_path: str) -> str:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    sessions_dir = _resolve(DEFAULT_SESSIONS)
    os.makedirs(sessions_dir, exist_ok=True)
    filename = f"{today}-{slug}.md"
    path = os.path.join(sessions_dir, filename)
    now = datetime.now(timezone.utc).isoformat(timespec="milliseconds")
    body = (
        f"# Session archive — {today}-{slug}\n\n"
        f"- **Archived:** {now}\n"
        f"- **Peak usage:** {usage:,} tokens\n"
        f"- **Budget file:** `{budget_path}`\n"
    )
    with open(path, "w", encoding="utf-8") as f:
        f.write(body)
    return path


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Measure context budget — warn-only, never aborts agents"
    )
    parser.add_argument("--tokens", type=int, default=None, help="Current token usage count")
    parser.add_argument("--budget", default=DEFAULT_BUDGET, help="Path to context_budget.json")
    parser.add_argument("--start-session", action="store_true", help="Record session start timestamp")
    parser.add_argument("--end-session", action="store_true", help="Record session end in budget history")
    parser.add_argument("--archive-session", action="store_true", help="Write work-log/sessions/{date}-{slug}.md")
    parser.add_argument("--slug", default="session", help="Session slug for --archive-session")
    parser.add_argument("--status", action="store_true", help="Print budget status and exit")
    args = parser.parse_args()

    if args.status:
        try:
            budget = load_budget(args.budget)
        except FileNotFoundError:
            budget = default_budget()
        print_status(budget)
        return 0

    if args.tokens is None:
        parser.error("--tokens is required unless --status is used")

    now = datetime.now(timezone.utc).isoformat(timespec="milliseconds")

    try:
        budget = load_budget(args.budget)
    except FileNotFoundError:
        budget = default_budget()

    usage = args.tokens
    limit = budget.get("hardLimit", HARD_LIMIT)
    remaining = limit - usage

    if args.start_session:
        budget["sessionStart"] = now
        print(f"Session started: {now}")

    budget["currentUsage"] = usage
    budget["remaining"] = remaining

    if args.end_session or args.archive_session:
        budget["sessionEnd"] = now
        entry = {
            "endedAt": now,
            "peakUsage": usage,
            "reason": "archive_session" if args.archive_session else "manual_end",
        }
        if args.archive_session:
            entry["slug"] = args.slug
        budget.setdefault("history", []).append(entry)

    save_budget(args.budget, budget)

    if args.archive_session:
        archive_path = archive_session(args.slug, usage, args.budget)
        print(f"Archived session: {archive_path}")

    if args.end_session and not args.archive_session:
        print(f"Session ended: {now}")
        print(f"Peak usage: {usage:,} / {limit:,} tokens")

    pct = (usage / limit * 100) if limit else 0

    if usage >= HARD_LIMIT:
        print(f"\n🔴 CRITICAL: {usage:,} / {limit:,} tokens ({pct:.0f}%)", file=sys.stderr)
        print("   At or above ceiling — compact context and archive the session soon.", file=sys.stderr)
        print("   Run: python additional-modules/scripts/measure_context.py --archive-session --slug <topic> --tokens <count>", file=sys.stderr)
    elif usage >= CRITICAL_THRESHOLD:
        print(f"🔴 CRITICAL: {usage:,} / {limit:,} tokens ({pct:.0f}%)")
        print(f"   Remaining: {remaining:,} — compact context soon.")
    elif usage >= WARN_THRESHOLD:
        print(f"⚠️  WARNING: {usage:,} / {limit:,} tokens ({pct:.0f}%)")
        print(f"   Remaining: {remaining:,} tokens")
    else:
        print(f"✅ Budget OK: {usage:,} / {limit:,} tokens ({pct:.0f}%)")
        print(f"   Remaining: {remaining:,} tokens")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
