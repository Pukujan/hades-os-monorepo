#!/usr/bin/env python3
"""Phase 02: Context budget enforcement tests.

Tests token budget lifecycle:
- Budget initialization and defaults
- Token measurement under/at/over limit
- Session start/end lifecycle
- History tracking and rotation
- Budget file persistence and atomic writes
- Integration with state module
"""

import json
import pytest
from pathlib import Path

from phase_02.budget import (
    BudgetError,
    create_budget,
    load_budget,
    save_budget,
    check_usage,
    start_session,
    end_session,
    rotate_history,
    get_remaining,
    WARN_THRESHOLD,
)

HARD_LIMIT = 28000
CRITICAL_START = int(HARD_LIMIT * 0.9)  # 25200


class TestBudgetDefaults:
    """Budget must initialize with valid defaults."""

    def test_create_budget_has_hard_limit(self):
        b = create_budget()
        assert b["hard_limit"] == HARD_LIMIT

    def test_create_budget_zero_usage(self):
        b = create_budget()
        assert b["current_usage"] == 0
        assert b["remaining"] == HARD_LIMIT

    def test_create_budget_no_session(self):
        b = create_budget()
        assert b["session_start"] is None
        assert b["session_end"] is None
        assert b["history"] == []

    def test_create_budget_custom_limit(self):
        b = create_budget(hard_limit=64000)
        assert b["hard_limit"] == 64000
        assert b["remaining"] == 64000


class TestUsageCheck:
    """Usage must report status correctly at all thresholds."""

    def test_ok_under_limit(self):
        result = check_usage(10000, HARD_LIMIT)
        assert result["status"] == "ok"
        assert result["remaining"] == 18000
        assert result["pct_used"] < 1.0

    def test_ok_under_warn_threshold(self):
        result = check_usage(10000, HARD_LIMIT)
        assert result["status"] == "ok"
        assert result["remaining"] == 18000

    def test_warning_at_warn_threshold(self):
        result = check_usage(WARN_THRESHOLD, HARD_LIMIT)
        assert result["status"] == "warning"
        assert result["remaining"] == HARD_LIMIT - WARN_THRESHOLD

    def test_warning_mid_range(self):
        result = check_usage(24000, HARD_LIMIT)
        assert result["status"] == "warning"

    def test_critical_near_limit(self):
        result = check_usage(CRITICAL_START + 500, HARD_LIMIT)
        assert result["status"] == "critical"
        assert result["remaining"] == HARD_LIMIT - (CRITICAL_START + 500)

    def test_critical_at_limit(self):
        result = check_usage(HARD_LIMIT, HARD_LIMIT)
        assert result["status"] == "critical"
        assert result["remaining"] == 0

    def test_critical_over_limit_no_abort(self):
        result = check_usage(HARD_LIMIT + 2000, HARD_LIMIT)
        assert result["status"] == "critical"
        assert result["remaining"] == 0


class TestSessionLifecycle:
    """Session start/end must track timestamps and history."""

    def test_start_session_records_timestamp(self, tmp_path):
        b = create_budget()
        budget_file = tmp_path / "context_budget.json"
        save_budget(b, budget_file)
        started = start_session(budget_file)
        assert started["session_start"] is not None
        assert started["session_end"] is None

    def test_end_session_records_timestamp(self, tmp_path):
        b = create_budget()
        budget_file = tmp_path / "context_budget.json"
        save_budget(b, budget_file)
        start_session(budget_file)
        ended = end_session(budget_file, peak_usage=15000, reason="manual")
        assert ended["session_end"] is not None
        assert len(ended["history"]) == 1
        assert ended["history"][0]["peak_usage"] == 15000

    def test_end_session_appends_to_history(self, tmp_path):
        b = create_budget()
        budget_file = tmp_path / "context_budget.json"
        save_budget(b, budget_file)
        start_session(budget_file)
        end_session(budget_file, peak_usage=10000, reason="manual")
        end_session(budget_file, peak_usage=12000, reason="manual")
        loaded = load_budget(budget_file)
        assert len(loaded["history"]) == 2

    def test_start_session_no_file_fails(self, tmp_path):
        with pytest.raises(BudgetError):
            start_session(tmp_path / "nonexistent.json")


class TestHistoryRotation:
    """History must cap entries and prune oldest."""

    def test_rotate_removes_oldest(self, tmp_path):
        b = create_budget()
        b["history"] = [{"peak_usage": i} for i in range(100)]
        budget_file = tmp_path / "context_budget.json"
        save_budget(b, budget_file)
        rotated = rotate_history(budget_file, max_entries=10)
        assert len(rotated["history"]) == 10
        assert rotated["history"][0]["peak_usage"] == 90  # newest kept

    def test_rotate_noop_under_limit(self, tmp_path):
        b = create_budget()
        b["history"] = [{"peak_usage": i} for i in range(5)]
        budget_file = tmp_path / "context_budget.json"
        save_budget(b, budget_file)
        rotated = rotate_history(budget_file, max_entries=10)
        assert len(rotated["history"]) == 5


class TestGetRemaining:
    """Remaining tokens must calculate correctly."""

    def test_remaining_subtracts_usage(self):
        rem = get_remaining(HARD_LIMIT, 20000)
        assert rem == 8000

    def test_remaining_zero_over_limit(self):
        rem = get_remaining(HARD_LIMIT, HARD_LIMIT + 2000)
        assert rem == 0


class TestBudgetPersistence:
    """Budget file must save and load atomically."""

    def test_save_and_load_roundtrip(self, tmp_path):
        original = create_budget(hard_limit=64000)
        budget_file = tmp_path / "context_budget.json"
        save_budget(original, budget_file)
        loaded = load_budget(budget_file)
        assert loaded["hard_limit"] == 64000

    def test_save_overwrites_existing(self, tmp_path):
        b1 = create_budget(hard_limit=HARD_LIMIT)
        budget_file = tmp_path / "context_budget.json"
        save_budget(b1, budget_file)
        b2 = create_budget(hard_limit=64000)
        save_budget(b2, budget_file)
        loaded = load_budget(budget_file)
        assert loaded["hard_limit"] == 64000

    def test_save_atomic_no_partial(self, tmp_path):
        b = create_budget()
        budget_file = tmp_path / "context_budget.json"
        save_budget(b, budget_file)
        assert not (tmp_path / "context_budget.json.tmp").exists()
