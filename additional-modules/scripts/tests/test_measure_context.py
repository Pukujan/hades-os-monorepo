#!/usr/bin/env python3
"""RED tests for measure_context.py and opencode.json context budget alignment.

These tests document the agent-contract bugs:
- measure_context.py hardcodes a 28k ceiling instead of the 40k contract.
- Warning/compact/stop thresholds do not match context_budget.json or AGENTS.md.
- Archive session produces double-dated filenames when the slug already contains a date.
- opencode.json is missing the model entry used by this agent, so auto-compaction cannot apply the correct limit.
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

# Import under test as a module so we can exercise helpers directly.
sys.path.insert(0, str(SCRIPTS_DIR))
import measure_context as mc


class TestContractLimits:
    """measure_context.py constants must match the 40k agent contract."""

    def test_hard_limit_matches_agent_contract(self):
        # AGENTS.md says 64,000 token ceiling.
        assert mc.HARD_LIMIT == 64000, f"Expected 64000, got {mc.HARD_LIMIT}"

    def test_warning_threshold_is_80_percent(self):
        assert mc.WARN_THRESHOLD == 51200, f"Expected 51200, got {mc.WARN_THRESHOLD}"

    def test_compact_threshold_is_90_percent(self):
        assert mc.CRITICAL_THRESHOLD == 57600, f"Expected 57600, got {mc.CRITICAL_THRESHOLD}"

    def test_default_budget_uses_contract_thresholds(self):
        budget = mc.default_budget()
        assert budget["hardLimit"] == 64000
        assert budget.get("warningAt") == 51200
        assert budget.get("compactAt") == 57600
        assert budget.get("stopAt") == 62400


class TestBudgetThresholdFromFile:
    """Script must read thresholds from context_budget.json, not hardcoded constants."""

    def test_load_budget_thresholds(self, tmp_path):
        budget_file = tmp_path / "context_budget.json"
        custom = {
            "hardLimit": 50000,
            "currentUsage": 0,
            "remaining": 50000,
            "warningAt": 40000,
            "compactAt": 45000,
            "stopAt": 48000,
            "sessionStart": None,
            "sessionEnd": None,
            "history": [],
        }
        budget_file.write_text(json.dumps(custom))
        loaded = mc.load_budget(str(budget_file.relative_to(Path.cwd()) if False else budget_file))
        assert loaded["hardLimit"] == 50000
        assert loaded["warningAt"] == 40000
        assert loaded["compactAt"] == 45000


class TestArchiveSessionSlug:
    """Archive filenames must follow {YYYY-MM-DD}-{slug}.md exactly."""

    def test_archive_strips_date_prefix_from_slug(self, tmp_path):
        sessions_dir = tmp_path / "sessions"
        original_default = mc.DEFAULT_SESSIONS
        try:
            mc.DEFAULT_SESSIONS = str(sessions_dir)
            path = mc.archive_session("2026-06-14-minions-ui-port", 1234, "context_budget.json")
            assert Path(path).name == "2026-06-14-minions-ui-port.md"
        finally:
            mc.DEFAULT_SESSIONS = original_default

    def test_archive_keeps_plain_slug(self, tmp_path):
        sessions_dir = tmp_path / "sessions"
        original_default = mc.DEFAULT_SESSIONS
        try:
            mc.DEFAULT_SESSIONS = str(sessions_dir)
            path = mc.archive_session("minions-ui-port", 1234, "context_budget.json")
            assert Path(path).name == "2026-06-14-minions-ui-port.md"
        finally:
            mc.DEFAULT_SESSIONS = original_default


class TestOpencodeConfig:
    """opencode.json must enable auto-compaction for the actual model at 40k."""

    def test_opencode_exists(self):
        config_path = CONTEXT_ENG_DIR / "opencode.json"
        assert config_path.exists(), "opencode.json must exist"

    def test_opencode_compaction_enabled(self):
        config = json.loads((CONTEXT_ENG_DIR / "opencode.json").read_text())
        assert config.get("compaction", {}).get("auto") is True
        assert config.get("compaction", {}).get("reserved") == 4000

    def test_opencode_has_actual_model_entry(self):
        config = json.loads((CONTEXT_ENG_DIR / "opencode.json").read_text())
        providers = config.get("provider", {})
        found = False
        for provider_name, provider_cfg in providers.items():
            models = provider_cfg.get("models", {})
            for model_id, model_cfg in models.items():
                if model_id == "deepseek-v4-pro":
                    limit = model_cfg.get("limit", {})
                    assert limit.get("context") == 64000, f"{model_id} context must be 64000"
                    found = True
        assert found, "opencode.json must contain a deepseek-v4-pro model entry with 64k context"


class TestCliThresholdOutput:
    """CLI output must use contract thresholds, not hardcoded 28k values."""

    def test_status_reports_64k_ceiling(self, tmp_path, monkeypatch):
        budget_file = tmp_path / "context_budget.json"
        budget_file.write_text(json.dumps({
            "hardLimit": 64000,
            "currentUsage": 0,
            "remaining": 64000,
            "warningAt": 51200,
            "compactAt": 57600,
            "stopAt": 62400,
            "sessionStart": None,
            "sessionEnd": None,
            "history": [],
        }))
        result = subprocess.run(
            [sys.executable, str(SCRIPTS_DIR / "measure_context.py"), "--status", "--budget", str(budget_file)],
            capture_output=True,
            text=True,
        )
        assert result.returncode == 0
        assert "64,000" in result.stdout, f"Status should report 64k ceiling, got: {result.stdout}"

    def test_warning_reported_at_52k(self, tmp_path, monkeypatch):
        budget_file = tmp_path / "context_budget.json"
        budget_file.write_text(json.dumps({
            "hardLimit": 64000,
            "currentUsage": 0,
            "remaining": 64000,
            "warningAt": 51200,
            "compactAt": 57600,
            "stopAt": 62400,
            "sessionStart": None,
            "sessionEnd": None,
            "history": [],
        }))
        result = subprocess.run(
            [sys.executable, str(SCRIPTS_DIR / "measure_context.py"), "--tokens", "53000", "--budget", str(budget_file)],
            capture_output=True,
            text=True,
        )
        assert result.returncode == 0
        assert "WARNING" in result.stdout, f"Expected WARNING at 53k, got: {result.stdout}"

    def test_compact_reported_at_58k(self, tmp_path, monkeypatch):
        budget_file = tmp_path / "context_budget.json"
        budget_file.write_text(json.dumps({
            "hardLimit": 64000,
            "currentUsage": 0,
            "remaining": 64000,
            "warningAt": 51200,
            "compactAt": 57600,
            "stopAt": 62400,
            "sessionStart": None,
            "sessionEnd": None,
            "history": [],
        }))
        result = subprocess.run(
            [sys.executable, str(SCRIPTS_DIR / "measure_context.py"), "--tokens", "58000", "--budget", str(budget_file)],
            capture_output=True,
            text=True,
        )
        assert result.returncode == 0
        assert "COMPACT" in result.stdout, f"Expected COMPACT at 58k, got: {result.stdout}"
