#!/usr/bin/env python3
"""Phase 01: State management — schema, checksums, backups, recovery."""

import json
import os
import shutil
import hashlib
from pathlib import Path
from datetime import datetime, timezone

VALID_PHASES = {"phase_01", "phase_02", "phase_03"}

REQUIRED_FIELDS = {
    "version",
    "phase",
    "tasks",
    "context_budget",
    "sessions",
}


class StateError(Exception):
    """Raised when state is invalid, corrupted, or unrecoverable."""
    pass


def create_state(override: dict | None = None) -> dict:
    """Create a fresh state with valid defaults."""
    state = {
        "version": "1.0.0",
        "phase": "phase_01",
        "tasks": {
            "completed": [],
            "in_progress": [],
            "next": [],
        },
        "context_budget": {
            "hard_limit": 28000,
            "current_usage": 0,
        },
        "sessions": {
            "current_id": None,
            "archive": [],
        },
        "last_updated": datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
    }
    if override:
        state.update(override)
    return state


def _validate(state: dict) -> None:
    """Validate state has required structure and valid values."""
    missing = REQUIRED_FIELDS - set(state.keys())
    if missing:
        raise StateError(f"Missing required fields: {missing}")

    if state.get("phase") not in VALID_PHASES:
        raise StateError(f"Invalid phase: {state.get('phase')}. Must be one of {VALID_PHASES}")

    tasks = state.get("tasks", {})
    for key in ("completed", "in_progress", "next"):
        if key not in tasks:
            raise StateError(f"tasks missing '{key}'")

    budget = state.get("context_budget", {})
    if "hard_limit" not in budget or "current_usage" not in budget:
        raise StateError("context_budget missing hard_limit or current_usage")

    sessions = state.get("sessions", {})
    if "current_id" not in sessions or "archive" not in sessions:
        raise StateError("sessions missing current_id or archive")


def load_state(path: Path) -> dict:
    """Load and validate state from file."""
    if not path.exists():
        raise StateError(f"State file not found: {path}")

    try:
        text = path.read_text(encoding="utf-8")
        state = json.loads(text)
    except json.JSONDecodeError as e:
        raise StateError(f"Invalid JSON in {path}: {e}")

    _validate(state)
    return state


def generate_checksum(path: Path) -> str:
    """Generate SHA256 hex checksum of file contents."""
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def validate_checksum(state_path: Path, checksum_path: Path) -> bool:
    """Return True if file checksum matches stored checksum."""
    if not checksum_path.exists():
        raise StateError(f"Checksum file not found: {checksum_path}")

    stored = checksum_path.read_text().strip()
    computed = generate_checksum(state_path)
    return stored == computed


def verify_integrity(state_path: Path, checksum_path: Path) -> bool:
    """Full integrity check: file exists, valid JSON, checksum matches."""
    if not state_path.exists():
        return False
    try:
        ok = validate_checksum(state_path, checksum_path)
        return ok is True
    except StateError:
        return False


def save_state(state: dict, state_path: Path) -> None:
    """Atomically save state with backup and checksum."""
    _validate(state)
    backup_path = state_path.parent / "agent_state.bak.json"
    checksum_path = state_path.parent / f"{state_path.name}.sha256"

    # Backup existing state before mutation
    if state_path.exists():
        shutil.copy2(str(state_path), str(backup_path))

    # Atomic write via temp file
    tmp_path = state_path.parent / f"{state_path.name}.tmp"
    text = json.dumps(state, indent=2, ensure_ascii=False) + "\n"
    tmp_path.write_text(text, encoding="utf-8")
    os.replace(str(tmp_path), str(state_path))

    # Update checksum
    cs = generate_checksum(state_path)
    checksum_path.write_text(cs + "\n", encoding="utf-8")


def recover_from_backup(state_path: Path, backup_path: Path) -> dict:
    """Restore state from backup file. Raises StateError if backup missing."""
    if not backup_path.exists():
        raise StateError(f"No backup to recover from: {backup_path}")

    recovered = load_state(backup_path)

    # Write recovered state back
    tmp_path = state_path.parent / f"{state_path.name}.tmp"
    text = json.dumps(recovered, indent=2, ensure_ascii=False) + "\n"
    tmp_path.write_text(text, encoding="utf-8")
    os.replace(str(tmp_path), str(state_path))

    # Regenerate checksum
    checksum_path = state_path.parent / f"{state_path.name}.sha256"
    cs = generate_checksum(state_path)
    checksum_path.write_text(cs + "\n", encoding="utf-8")

    return recovered
