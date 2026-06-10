#!/usr/bin/env python3
"""Phase 02: Context budget enforcement."""

import json
import os
from datetime import datetime, timezone
from pathlib import Path


class BudgetError(Exception):
    """Raised when budget is invalid or operation fails."""
    pass


WARN_THRESHOLD = 21600


def create_budget(hard_limit: int = 28000) -> dict:
    """Create a fresh budget with valid defaults."""
    return {
        "hard_limit": hard_limit,
        "current_usage": 0,
        "remaining": hard_limit,
        "session_start": None,
        "session_end": None,
        "history": [],
    }


def load_budget(path: Path) -> dict:
    """Load budget from file."""
    if not path.exists():
        raise BudgetError(f"Budget file not found: {path}")

    try:
        text = path.read_text(encoding="utf-8")
        budget = json.loads(text)
    except json.JSONDecodeError as e:
        raise BudgetError(f"Invalid JSON in {path}: {e}")

    required = {"hard_limit", "current_usage", "remaining", "session_start", "session_end", "history"}
    missing = required - set(budget.keys())
    if missing:
        raise BudgetError(f"Budget missing fields: {missing}")

    return budget


def save_budget(budget: dict, path: Path) -> None:
    """Atomically save budget via temp file + os.replace."""
    tmp = path.parent / f"{path.name}.tmp"
    text = json.dumps(budget, indent=2, ensure_ascii=False) + "\n"
    tmp.write_text(text, encoding="utf-8")
    os.replace(str(tmp), str(path))


def check_usage(usage: int, hard_limit: int) -> dict:
    """Check token usage. No abort — just status reporting.

    Status levels:
      - ok: usage < 21.6k
      - warning: 21.6k <= usage < 25.2k  (compact soon)
      - critical: usage >= 25.2k  (compact now, but don't abort)

    Returns status dict with: status, remaining, pct_used.
    """
    remaining = max(0, hard_limit - usage)
    pct_used = usage / hard_limit if hard_limit else 1.0

    if usage >= WARN_THRESHOLD and usage < hard_limit - (hard_limit * 0.1):
        status = "warning"
    elif usage >= hard_limit - (hard_limit * 0.1):
        status = "critical"
    else:
        status = "ok"

    return {
        "status": status,
        "usage": usage,
        "hard_limit": hard_limit,
        "remaining": remaining,
        "pct_used": round(pct_used, 4),
    }


def get_remaining(hard_limit: int, usage: int) -> int:
    """Calculate remaining tokens, capped at 0."""
    return max(0, hard_limit - usage)


def start_session(budget_path: Path) -> dict:
    """Record session start timestamp in budget file."""
    budget = load_budget(budget_path)
    budget["session_start"] = datetime.now(timezone.utc).isoformat(timespec="milliseconds")
    save_budget(budget, budget_path)
    return budget


def end_session(budget_path: Path, peak_usage: int, reason: str = "manual") -> dict:
    """Record session end and append to history."""
    budget = load_budget(budget_path)
    now = datetime.now(timezone.utc).isoformat(timespec="milliseconds")
    budget["session_end"] = now
    budget["current_usage"] = peak_usage
    budget["remaining"] = get_remaining(budget["hard_limit"], peak_usage)

    entry = {
        "ended_at": now,
        "peak_usage": peak_usage,
        "reason": reason,
    }
    budget.setdefault("history", []).append(entry)
    save_budget(budget, budget_path)
    return budget


def rotate_history(budget_path: Path, max_entries: int = 10) -> dict:
    """Prune history to max_entries newest entries. Returns updated budget."""
    budget = load_budget(budget_path)
    history = budget.get("history", [])
    if len(history) > max_entries:
        budget["history"] = history[-max_entries:]
    save_budget(budget, budget_path)
    return budget
