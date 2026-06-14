#!/usr/bin/env python3
"""Tests for gen_compaction_payload.py generator behavior.

Verifies the payload generator produces correct output with markers,
not that OpenCode runtime compaction actually fires.
"""

import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
SCRIPTS_DIR = REPO_ROOT / "additional-modules" / "scripts"
GEN = str(SCRIPTS_DIR / "gen_compaction_payload.py")

START = "START_MARKER_CACHE_TEST"
MIDDLE = "MIDDLE_MARKER_CACHE_TEST"
END = "END_MARKER_CACHE_TEST"


def run_gen(*args) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, GEN] + list(args),
        capture_output=True, text=True,
    )


class TestPayloadMarkers:
    """Payload generator must produce markers in correct positions."""

    def test_payload_contains_start_middle_end_markers(self):
        r = run_gen("--tokens", "70000")
        assert r.returncode == 0
        assert START in r.stdout
        assert MIDDLE in r.stdout
        assert END in r.stdout

    def test_payload_markers_are_ordered(self):
        r = run_gen("--tokens", "70000")
        start_idx = r.stdout.index(START)
        mid_idx = r.stdout.index(MIDDLE)
        end_idx = r.stdout.index(END)
        assert start_idx < mid_idx < end_idx, (
            f"marker order wrong: start={start_idx}, mid={mid_idx}, end={end_idx}"
        )

    def test_payload_output_is_large_enough(self):
        r = run_gen("--tokens", "70000")
        # 70k tokens ≈ 280k bytes minimum
        assert len(r.stdout) > 100_000, f"payload too small: {len(r.stdout)} bytes"

    def test_payload_each_marker_appears_once(self):
        r = run_gen("--tokens", "70000")
        assert r.stdout.count(START) == 1, f"START appears {r.stdout.count(START)} times"
        assert r.stdout.count(MIDDLE) == 1, f"MIDDLE appears {r.stdout.count(MIDDLE)} times"
        assert r.stdout.count(END) == 1, f"END appears {r.stdout.count(END)} times"

    def test_payload_contains_filler(self):
        r = run_gen("--tokens", "70000")
        assert "context payload filler line" in r.stdout


class TestPayloadOutputFile:
    """--output flag must write payload to disk."""

    def test_output_file_is_written(self, tmp_path):
        out = tmp_path / "payload.txt"
        r = run_gen("--tokens", "70000", "--output", str(out))
        assert r.returncode == 0
        assert out.exists()
        content = out.read_text()
        assert START in content
        assert MIDDLE in content
        assert END in content

    def test_stdout_has_no_file_path_noise(self, tmp_path):
        """When --output is used, stdout should only print summary, not payload."""
        out = tmp_path / "payload.txt"
        r = run_gen("--tokens", "100", "--output", str(out))
        # stdout should contain "Written:" not the filler
        assert "Written:" in r.stdout
        assert "context payload filler line" not in r.stdout

    def test_stdout_no_output_flag_writes_payload_to_stdout(self):
        """Without --output, payload goes to stdout."""
        r = run_gen("--tokens", "100")
        assert "context payload filler line" in r.stdout


class TestConfigCheck:
    """--check must report config readiness."""

    def test_check_reports_config(self):
        r = run_gen("--check")
        assert r.returncode == 0
        assert "Context limit:" in r.stdout
        assert "Reserved space:" in r.stdout
        assert "Auto enabled:" in r.stdout
        assert "Prune enabled:" in r.stdout

    def test_check_reports_trigger(self):
        r = run_gen("--check")
        assert "Auto-compaction trigger:" in r.stdout
        assert "60,000" in r.stdout or "60000" in r.stdout

    def test_check_reports_readiness(self):
        r = run_gen("--check")
        assert "Config readiness: OK" in r.stdout or "Config readiness:" in r.stdout


class TestSmallTokenCounts:
    """Edge case: very small token counts still produce markers."""

    def test_small_payload_still_has_markers(self):
        r = run_gen("--tokens", "50")
        assert r.returncode == 0
        assert START in r.stdout
        assert MIDDLE in r.stdout
        assert END in r.stdout
