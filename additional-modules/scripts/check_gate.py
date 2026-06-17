#!/usr/bin/env python3
"""check_gate.py — blocks module switch if lint:architecture fails.

Usage:
    python additional-modules/scripts/check_gate.py --module <slug>
    python additional-modules/scripts/check_gate.py --module ingest-router --update-state

Rules:
    - Must pass lint:architecture before allowing module transition.
    - Optionally updates buildplan/agent_state.json with lint result.
    - Exit 0 = gate passed, Exit 1 = gate blocked.

Paths resolve relative to repo root (parent of scripts/).
"""

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone

# Resolve paths relative to the current working directory (the scaffolded project root)
_REPO_ROOT = os.getcwd()


def _resolve(path: str) -> str:
    if os.path.isabs(path):
        return path
    return os.path.join(_REPO_ROOT, path)


def load_state(path: str) -> dict:
    with open(_resolve(path), "r", encoding="utf-8") as f:
        return json.load(f)


def save_state(path: str, state: dict) -> None:
    resolved = _resolve(path)
    tmp = resolved + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2, ensure_ascii=False)
        f.write("\n")
    os.replace(tmp, resolved)


def run_lint(repo_root: str) -> tuple[int, str]:
    if os.name == "nt":
        result = subprocess.run(
            "npm run lint:architecture",
            cwd=repo_root,
            capture_output=True,
            text=True,
            shell=True,
        )
    else:
        result = subprocess.run(
            ["npm", "run", "lint:architecture"],
            cwd=repo_root,
            capture_output=True,
            text=True,
        )
    return result.returncode, (result.stdout + result.stderr).strip()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Gate check — blocks module switch if lint fails"
    )
    parser.add_argument(
        "--module",
        required=True,
        help="Module slug to transition to",
    )
    parser.add_argument(
        "--state",
        default="additional-modules/buildplan/agent_state.json",
        help="Path to agent_state.json (default: additional-modules/buildplan/agent_state.json)",
    )
    parser.add_argument(
        "--update-state",
        action="store_true",
        help="Update agent_state.json with lint result",
    )
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.dirname(os.path.dirname(script_dir))

    print(f"Gate check for module: {args.module}")
    print(f"Running lint:architecture ...")

    # Run lint from repo root (where package.json with scripts lives)
    exit_code, output = run_lint(repo_root)
    now = datetime.now(timezone.utc).isoformat(timespec="milliseconds")

    if exit_code != 0:
        print(f"\n❌ GATE BLOCKED — lint:architecture failed", file=sys.stderr)
        print(f"Output:\n{output}", file=sys.stderr)

        if args.update_state:
            try:
                state = load_state(args.state)
                state.setdefault("lint", {})
                state["lint"]["lastRun"] = now
                state["lint"]["lastResult"] = output[:500]
                state["lint"]["lastPass"] = False
                save_state(args.state, state)
                print(f"Updated: {args.state}", file=sys.stderr)
            except FileNotFoundError:
                print(f"State file not found: {args.state}", file=sys.stderr)

        return 1

    print(f"✅ GATE PASSED — lint:architecture clean")
    print(f"Module transition to `{args.module}` is allowed.")

    if args.update_state:
        try:
            state = load_state(args.state)
            state.setdefault("lint", {})
            state["lint"]["lastRun"] = now
            state["lint"]["lastResult"] = "passed"
            state["lint"]["lastPass"] = True
            state["activeModule"]["slug"] = args.module
            state["activeModule"]["startedAt"] = now
            save_state(args.state, state)
            print(f"Updated: {args.state}")
        except FileNotFoundError:
            print(f"State file not found: {args.state}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
