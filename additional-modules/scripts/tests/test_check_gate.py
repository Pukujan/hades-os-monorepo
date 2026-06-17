"""Tests for check_gate.py Windows process launch behavior."""

from pathlib import Path
import sys

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
SCRIPTS_DIR = REPO_ROOT / "additional-modules" / "scripts"

sys.path.insert(0, str(SCRIPTS_DIR))
import check_gate


@pytest.mark.skipif(sys.platform != "win32", reason="Windows-specific launch path")
def test_run_lint_uses_shell_launch_on_windows(monkeypatch):
    calls = []

    class Result:
        returncode = 0
        stdout = "ok"
        stderr = ""

    def fake_run(*args, **kwargs):
        calls.append((args, kwargs))
        return Result()

    monkeypatch.setattr(check_gate.subprocess, "run", fake_run)

    exit_code, output = check_gate.run_lint(str(REPO_ROOT))

    assert exit_code == 0
    assert output == "ok"
    assert calls, "subprocess.run should be called"
    _, kwargs = calls[0]
    assert kwargs.get("shell") is True
    assert kwargs.get("cwd") == str(REPO_ROOT)


@pytest.mark.skipif(sys.platform != "win32", reason="Windows-specific launch path")
def test_run_lint_uses_npm_command_string_on_windows(monkeypatch):
    observed = {}

    class Result:
        returncode = 0
        stdout = "ok"
        stderr = ""

    def fake_run(command, **kwargs):
        observed["command"] = command
        observed["kwargs"] = kwargs
        return Result()

    monkeypatch.setattr(check_gate.subprocess, "run", fake_run)

    check_gate.run_lint(str(REPO_ROOT))

    assert observed["command"] == "npm run lint:architecture"
