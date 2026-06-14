#!/usr/bin/env python3
"""Integration tests for auto-compaction pipeline end-to-end.

Verifies the full chain:
  opencode.json compaction config → model context limit →
  measure_context.py thresholds → CLI output at each level.

Also sends simulated 64k-context inputs to verify every threshold
fires correctly and the reserved-compaction window is respected.
"""

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
SCRIPTS_DIR = REPO_ROOT / "additional-modules" / "scripts"
BUILDPLAN_DIR = REPO_ROOT / "additional-modules" / "buildplan"
CONTEXT_ENG_DIR = REPO_ROOT / "additional-modules" / "context-engineering"

sys.path.insert(0, str(SCRIPTS_DIR))
import measure_context as mc


# ── helpers ────────────────────────────────────────────────────────────────

def load_opencode_config() -> dict:
    return json.loads((CONTEXT_ENG_DIR / "opencode.json").read_text())


def make_budget(tmp_path, usage=0):
    """Write a budget file with contract-aligned thresholds."""
    budget_file = tmp_path / "context_budget.json"
    budget_file.write_text(json.dumps({
        "hardLimit": 64000,
        "currentUsage": usage,
        "remaining": 64000 - usage,
        "warningAt": 51200,
        "compactAt": 57600,
        "stopAt": 62400,
        "sessionStart": None,
        "sessionEnd": None,
        "history": [],
    }))
    return budget_file


def run_measure(tokens: int, budget_path, *extra_args) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(SCRIPTS_DIR / "measure_context.py"),
         "--tokens", str(tokens), "--budget", str(budget_path)] + list(extra_args),
        capture_output=True, text=True,
    )


# ── Config alignment tests ────────────────────────────────────────────────

class TestCompactionConfigAlignment:
    """opencode.json compaction config must align with measure_context.py."""

    def test_model_context_limit_matches_hard_limit(self):
        cfg = load_opencode_config()
        model_limit = None
        for pname, pcfg in cfg.get("provider", {}).items():
            for mid, mcfg in pcfg.get("models", {}).items():
                model_limit = mcfg.get("limit", {}).get("context")
        assert model_limit == mc.HARD_LIMIT, (
            f"opencode.json model context={model_limit} != measure_context HARD_LIMIT={mc.HARD_LIMIT}"
        )

    def test_reserved_space_matches_compact_window(self):
        cfg = load_opencode_config()
        reserved = cfg.get("compaction", {}).get("reserved", 0)
        # Compaction should trigger when context reaches limit - reserved
        expected_trigger = mc.HARD_LIMIT - reserved
        # The compact threshold in measure_context.py (90%) should fire BEFORE
        # the reserved window is opened, giving a warning before auto-compaction
        assert mc.CRITICAL_THRESHOLD == 57600, f"compact threshold changed: {mc.CRITICAL_THRESHOLD}"
        assert reserved == 4000, f"reserved space changed: {reserved}"
        # reserved window: 60,000 is the auto-compaction trigger point
        assert expected_trigger == 60000, f"compaction trigger should be 60000, got {expected_trigger}"
        # compact warning at 57,600 gives ~2,400 token buffer before 60,000
        buffer = expected_trigger - mc.CRITICAL_THRESHOLD
        assert buffer > 0, f"no buffer between compact warning ({mc.CRITICAL_THRESHOLD}) and trigger ({expected_trigger})"

    def test_compaction_auto_enabled(self):
        cfg = load_opencode_config()
        assert cfg.get("compaction", {}).get("auto") is True, "compaction.auto must be true"

    def test_compaction_prune_enabled(self):
        cfg = load_opencode_config()
        assert cfg.get("compaction", {}).get("prune") is True, "compaction.prune must be true"

    def test_symlink_or_env_var_accessible(self):
        """AGENTS.md contract: symlink or OPENCODE_CONFIG env var must work."""
        symlink = REPO_ROOT / "opencode.json"
        env = os.environ.get("OPENCODE_CONFIG", "")
        target = CONTEXT_ENG_DIR / "opencode.json"
        assert symlink.exists() or env, (
            "neither opencode.json symlink nor OPENCODE_CONFIG env var set"
        )
        if symlink.is_symlink():
            resolved = symlink.resolve()
            assert resolved == target.resolve(), (
                f"symlink points to {resolved}, expected {target.resolve()}"
            )


# ── Threshold progression tests ───────────────────────────────────────────

class TestCompactionThresholdProgression:
    """Simulate filling context from 0 → 64k and verify every threshold fires."""

    # ── Normal zone (0 – 51,199) ──

    def test_500_tokens_is_budget_ok(self, tmp_path):
        budget_file = make_budget(tmp_path, usage=500)
        r = run_measure(500, budget_file)
        assert r.returncode == 0
        assert "Budget OK" in r.stdout

    def test_50k_tokens_is_budget_ok(self, tmp_path):
        budget_file = make_budget(tmp_path, usage=50000)
        r = run_measure(50000, budget_file)
        assert r.returncode == 0
        assert "Budget OK" in r.stdout

    # ── Warning zone (51,200 – 57,599) ──

    def test_51200_triggers_warning(self, tmp_path):
        budget_file = make_budget(tmp_path, usage=51200)
        r = run_measure(51200, budget_file)
        assert r.returncode == 0
        assert "WARNING" in r.stdout, f"Expected WARNING at 51,200, got: {r.stdout}"

    def test_53000_triggers_warning(self, tmp_path):
        budget_file = make_budget(tmp_path, usage=53000)
        r = run_measure(53000, budget_file)
        assert r.returncode == 0
        assert "WARNING" in r.stdout

    def test_57000_triggers_warning_not_compact(self, tmp_path):
        budget_file = make_budget(tmp_path, usage=57000)
        r = run_measure(57000, budget_file)
        assert r.returncode == 0
        assert "WARNING" in r.stdout
        assert "COMPACT" not in r.stdout, "Should not trigger COMPACT yet"

    # ── Compact zone (57,600 – 62,399) ──

    def test_57600_triggers_compact(self, tmp_path):
        budget_file = make_budget(tmp_path, usage=57600)
        r = run_measure(57600, budget_file)
        assert r.returncode == 0
        assert "COMPACT" in r.stdout, f"Expected COMPACT at 57,600, got: {r.stdout}"

    def test_58000_triggers_compact(self, tmp_path):
        budget_file = make_budget(tmp_path, usage=58000)
        r = run_measure(58000, budget_file)
        assert r.returncode == 0
        assert "COMPACT" in r.stdout

    def test_59000_triggers_compact(self, tmp_path):
        budget_file = make_budget(tmp_path, usage=59000)
        r = run_measure(59000, budget_file)
        assert r.returncode == 0
        assert "COMPACT" in r.stdout

    # ── Auto-compaction trigger boundary (60,000) ──

    def test_60000_is_compaction_trigger_boundary(self, tmp_path):
        """The opencode.json reserved=4000 means auto-compaction fires at 60,000.
        measure_context.py should still show COMPACT (stop zone not yet reached)."""
        budget_file = make_budget(tmp_path, usage=60000)
        r = run_measure(60000, budget_file)
        assert r.returncode == 0
        assert "COMPACT" in r.stdout, (
            f"At 60,000 (compaction trigger boundary), expected COMPACT, got: {r.stdout}"
        )
        assert "STOP" not in r.stdout, "Should not trigger STOP at 60,000"

    # ── Stop zone (62,400 – 63,999) ──

    def test_62400_triggers_stop(self, tmp_path):
        budget_file = make_budget(tmp_path, usage=62400)
        r = run_measure(62400, budget_file)
        assert r.returncode == 0
        assert "STOP" in r.stdout, f"Expected STOP at 62,400, got: {r.stdout}"

    def test_63000_triggers_stop(self, tmp_path):
        budget_file = make_budget(tmp_path, usage=63000)
        r = run_measure(63000, budget_file)
        assert r.returncode == 0
        assert "STOP" in r.stdout

    # ── Critical zone (64,000) ──

    def test_64000_triggers_critical(self, tmp_path):
        budget_file = make_budget(tmp_path, usage=64000)
        r = run_measure(64000, budget_file)
        assert r.returncode == 0
        assert "CRITICAL" in r.stdout, f"Expected CRITICAL at 64,000, got: {r.stdout}"

    # ── Warn-only contract: never exits non-zero ──

    def test_never_exits_nonzero_at_ceiling(self, tmp_path):
        budget_file = make_budget(tmp_path, usage=64000)
        r = run_measure(64000, budget_file)
        assert r.returncode == 0, (
            "warn-only contract violated: exit code must be 0 even at ceiling"
        )

    def test_never_exits_nonzero_above_ceiling(self, tmp_path):
        budget_file = make_budget(tmp_path, usage=65000)
        r = run_measure(65000, budget_file)
        assert r.returncode == 0, (
            "warn-only contract violated: exit code must be 0 even above ceiling"
        )


# ── AGENTS.md ↔ code alignment ────────────────────────────────────────────

class TestAgentsMdCodeAlignment:
    """AGENTS.md contract numbers must match measure_context.py constants."""

    def test_agents_md_64000_matches_hard_limit(self):
        agents_md = (REPO_ROOT / "AGENTS.md").read_text()
        assert "64,000" in agents_md, "AGENTS.md missing 64,000"
        assert mc.HARD_LIMIT == 64000

    def test_agents_md_57600_matches_compact_threshold(self):
        agents_md = (REPO_ROOT / "AGENTS.md").read_text()
        assert "57600" in agents_md, "AGENTS.md missing 57600"
        assert mc.CRITICAL_THRESHOLD == 57600

    def test_agents_md_warn_only_preserved(self):
        agents_md = (REPO_ROOT / "AGENTS.md").read_text()
        assert "warn-only" in agents_md, "AGENTS.md missing warn-only"


# ── Full integration: config + code + CLI ─────────────────────────────────

class TestFullCompactionPipeline:
    """End-to-end: verify the full pipeline is consistent."""

    def test_pipeline_all_constants_aligned(self):
        """Every number in the pipeline must match: opencode.json ↔ mc ↔ AGENTS.md."""
        cfg = load_opencode_config()
        reserved = cfg["compaction"]["reserved"]
        model_limit = None
        for p in cfg.get("provider", {}).values():
            for m in p.get("models", {}).values():
                model_limit = m["limit"]["context"]

        agents_md = (REPO_ROOT / "AGENTS.md").read_text()

        # All three sources must agree on 64,000
        assert model_limit == 64000
        assert mc.HARD_LIMIT == 64000
        assert "64000" in agents_md
        assert "64,000" in agents_md

        # Reserved must be 4000 everywhere
        assert reserved == 4000
        assert "4000" in agents_md

        # Compact at 57,600 (90%)
        assert mc.CRITICAL_THRESHOLD == 57600
        assert "57600" in agents_md
        assert "compact" in agents_md.lower()

        # Auto-compaction trigger = limit - reserved = 60,000
        trigger = model_limit - reserved
        assert trigger == 60000, f"compaction trigger should be 60000, got {trigger}"

    def test_pipeline_status_reports_correct_info(self, tmp_path):
        """--status should report all threshold info."""
        budget_file = tmp_path / "context_budget.json"
        budget_file.write_text(json.dumps({
            "hardLimit": 64000,
            "currentUsage": 40000,
            "remaining": 24000,
            "warningAt": 51200,
            "compactAt": 57600,
            "stopAt": 62400,
            "sessionStart": "2026-06-14T12:00:00Z",
            "sessionEnd": None,
            "history": [],
        }))
        r = subprocess.run(
            [sys.executable, str(SCRIPTS_DIR / "measure_context.py"),
             "--status", "--budget", str(budget_file)],
            capture_output=True, text=True,
        )
        assert r.returncode == 0
        assert "40,000" in r.stdout
        assert "64,000" in r.stdout
        assert "51,200" in r.stdout
        assert "57,600" in r.stdout
        assert "62,400" in r.stdout
