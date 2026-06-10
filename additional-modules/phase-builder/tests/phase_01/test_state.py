#!/usr/bin/env python3
"""Phase 01: State integrity tests.

Tests the agent_state.json lifecycle:
- Schema validation (required fields, types)
- Checksum generation and verification
- Backup preservation before mutation
- Corrupted state detection
- Recovery from backup
"""

import json
import os
import shutil
import tempfile
from pathlib import Path

import pytest

# Phase 01 modules (implement in phase_01/)
from phase_01.state import (
    StateError,
    create_state,
    load_state,
    save_state,
    validate_checksum,
    generate_checksum,
    verify_integrity,
    recover_from_backup,
)

# --- Schema validation tests ---

class TestStateSchema:
    """agent_state.json must have required structure."""

    def test_create_state_returns_valid_defaults(self):
        state = create_state()
        assert state["version"] == "1.0.0"
        assert "phase" in state
        assert state["phase"] == "phase_01"
        assert "tasks" in state
        assert isinstance(state["tasks"], dict)
        assert "completed" in state["tasks"]
        assert "in_progress" in state["tasks"]
        assert "next" in state["tasks"]

    def test_state_has_context_budget(self):
        state = create_state()
        budget = state["context_budget"]
        assert "hard_limit" in budget
        assert budget["hard_limit"] == 28000
        assert "current_usage" in budget
        assert budget["current_usage"] == 0

    def test_state_has_sessions(self):
        state = create_state()
        sessions = state["sessions"]
        assert "current_id" in sessions
        assert "archive" in sessions
        assert isinstance(sessions["archive"], list)

    def test_load_state_valid_json_succeeds(self, tmp_path):
        state = create_state()
        state_file = tmp_path / "agent_state.json"
        state_file.write_text(json.dumps(state))
        loaded = load_state(state_file)
        assert loaded["version"] == "1.0.0"
        assert loaded["phase"] == "phase_01"

    def test_load_state_missing_required_field_fails(self, tmp_path):
        bad = {"version": "1.0.0"}
        state_file = tmp_path / "agent_state.json"
        state_file.write_text(json.dumps(bad))
        with pytest.raises(StateError):
            load_state(state_file)

    def test_load_state_invalid_phase_fails(self, tmp_path):
        bad = {
            "version": "1.0.0",
            "phase": "phase_99_invalid",
            "tasks": {"completed": [], "in_progress": [], "next": []},
            "context_budget": {"hard_limit": 28000, "current_usage": 0},
            "sessions": {"current_id": None, "archive": []},
        }
        state_file = tmp_path / "agent_state.json"
        state_file.write_text(json.dumps(bad))
        with pytest.raises(StateError):
            load_state(state_file)

    def test_load_state_bad_json_fails(self, tmp_path):
        state_file = tmp_path / "agent_state.json"
        state_file.write_text("{invalid json")
        with pytest.raises(StateError):
            load_state(state_file)

    def test_load_state_missing_file_fails(self, tmp_path):
        with pytest.raises(StateError):
            load_state(tmp_path / "nonexistent.json")


# --- Checksum tests ---

class TestChecksum:
    """Detached SHA256 checksum must protect state from corruption."""

    def test_generate_checksum_returns_hex_string(self, tmp_path):
        state = create_state()
        state_file = tmp_path / "agent_state.json"
        state_file.write_text(json.dumps(state, indent=2))
        checksum = generate_checksum(state_file)
        assert isinstance(checksum, str)
        assert len(checksum) == 64  # SHA256 hex length

    def test_checksum_is_deterministic(self, tmp_path):
        state = create_state()
        state_file = tmp_path / "agent_state.json"
        state_file.write_text(json.dumps(state, indent=2))
        cs1 = generate_checksum(state_file)
        cs2 = generate_checksum(state_file)
        assert cs1 == cs2

    def test_checksum_changes_when_state_changes(self, tmp_path):
        state = create_state()
        state_file = tmp_path / "agent_state.json"
        state_file.write_text(json.dumps(state, indent=2))
        cs1 = generate_checksum(state_file)
        state["phase"] = "phase_02"
        state_file.write_text(json.dumps(state, indent=2))
        cs2 = generate_checksum(state_file)
        assert cs1 != cs2

    def test_validate_checksum_passes_valid(self, tmp_path):
        state = create_state()
        state_file = tmp_path / "agent_state.json"
        checksum_file = tmp_path / "agent_state.json.sha256"
        state_file.write_text(json.dumps(state, indent=2))
        cs = generate_checksum(state_file)
        checksum_file.write_text(cs)
        assert validate_checksum(state_file, checksum_file) is True

    def test_validate_checksum_fails_corrupted(self, tmp_path):
        state = create_state()
        state_file = tmp_path / "agent_state.json"
        checksum_file = tmp_path / "agent_state.json.sha256"
        state_file.write_text(json.dumps(state, indent=2))
        cs = generate_checksum(state_file)
        checksum_file.write_text("0" * 64)  # wrong checksum
        assert validate_checksum(state_file, checksum_file) is False

    def test_validate_checksum_fails_missing_checksum_file(self, tmp_path):
        state = create_state()
        state_file = tmp_path / "agent_state.json"
        state_file.write_text(json.dumps(state, indent=2))
        checksum_file = tmp_path / "agent_state.json.sha256"
        with pytest.raises(StateError):
            validate_checksum(state_file, checksum_file)


# --- Save and backup tests ---

class TestSaveAndBackup:
    """save_state must create backup, write new state, generate checksum."""

    def test_save_creates_state_file(self, tmp_path):
        state = create_state()
        state_file = tmp_path / "agent_state.json"
        save_state(state, state_file)
        assert state_file.exists()
        loaded = load_state(state_file)
        assert loaded["version"] == "1.0.0"

    def test_save_creates_checksum(self, tmp_path):
        state = create_state()
        state_file = tmp_path / "agent_state.json"
        save_state(state, state_file)
        checksum_file = state_file.parent / f"{state_file.name}.sha256"
        assert checksum_file.exists()
        assert validate_checksum(state_file, checksum_file)

    def test_save_creates_backup_on_second_write(self, tmp_path):
        state = create_state()
        state_file = tmp_path / "agent_state.json"
        backup_file = tmp_path / "agent_state.bak.json"
        save_state(state, state_file)
        assert not backup_file.exists()  # first write: no backup yet
        state["phase"] = "phase_02"
        save_state(state, state_file)
        assert backup_file.exists()  # second write: backup created
        backup_data = json.loads(backup_file.read_text())
        assert backup_data["phase"] == "phase_01"  # old value preserved

    def test_backup_preserves_original_state(self, tmp_path):
        state = create_state()
        state["phase"] = "phase_01"
        state["tasks"]["in_progress"] = ["task_alpha"]
        state_file = tmp_path / "agent_state.json"
        backup_file = tmp_path / "agent_state.bak.json"
        save_state(state, state_file)
        state["phase"] = "phase_02"
        state["tasks"]["in_progress"] = ["task_beta"]
        save_state(state, state_file)
        backup_data = json.loads(backup_file.read_text())
        assert backup_data["phase"] == "phase_01"
        assert backup_data["tasks"]["in_progress"] == ["task_alpha"]

    def test_verify_integrity_passes_full_save(self, tmp_path):
        state = create_state()
        state_file = tmp_path / "agent_state.json"
        checksum_file = tmp_path / "agent_state.json.sha256"
        save_state(state, state_file)
        ok = verify_integrity(state_file, checksum_file)
        assert ok is True

    def test_verify_integrity_fails_tampered_state(self, tmp_path):
        state = create_state()
        state_file = tmp_path / "agent_state.json"
        checksum_file = tmp_path / "agent_state.json.sha256"
        save_state(state, state_file)
        state_file.write_text(json.dumps({"tampered": True}))  # corrupt
        ok = verify_integrity(state_file, checksum_file)
        assert ok is False


# --- Recovery tests ---

class TestRecovery:
    """Must be able to restore from backup when state is corrupted."""

    def test_recovery_restores_from_backup(self, tmp_path):
        original = create_state()
        original["phase"] = "phase_01"
        state_file = tmp_path / "agent_state.json"
        backup_file = tmp_path / "agent_state.bak.json"
        checksum_file = tmp_path / "agent_state.json.sha256"
        save_state(original, state_file)
        original["phase"] = "phase_02"
        save_state(original, state_file)
        state_file.write_text("{corrupted}")  # simulate corruption
        assert verify_integrity(state_file, checksum_file) is False
        recovered = recover_from_backup(state_file, backup_file)
        assert recovered["phase"] == "phase_01"

    def test_recovery_fails_no_backup(self, tmp_path):
        state = create_state()
        state_file = tmp_path / "agent_state.json"
        backup_file = tmp_path / "agent_state.bak.json"
        state_file.write_text("{corrupted}")
        with pytest.raises(StateError):
            recover_from_backup(state_file, backup_file)
