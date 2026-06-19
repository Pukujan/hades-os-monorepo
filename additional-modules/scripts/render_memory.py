#!/usr/bin/env python3
"""render_memory.py — renders template/MEMORY.md from buildplan/agent_state.json.

Usage:
    python additional-modules/scripts/render_memory.py [--state additional-modules/buildplan/agent_state.json]

Rules:
    - MEMORY.md is read-only to the agent.
    - Agent writes agent_state.json; this script updates MEMORY.md.

Paths resolve relative to repo root (parent of scripts/).
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone

# Resolve paths relative to the current working directory (the scaffolded project root)
_REPO_ROOT = os.getcwd()


def _resolve(path: str) -> str:
    """Resolve path: if relative, anchor to repo root."""
    if os.path.isabs(path):
        return path
    return os.path.join(_REPO_ROOT, path)


def load_state(path: str) -> dict:
    with open(_resolve(path), "r", encoding="utf-8") as f:
        return json.load(f)


def render(state: dict) -> str:
    active = state.get("activeModule", {})
    slug = active.get("slug", "none")
    branch = state.get("branch", "main")
    commit = state.get("latestCommit", "unknown")
    modules = state.get("modules", {})
    arch = state.get("architecture", {})
    sessions = state.get("sessions", {})
    lint = state.get("lint", {})
    budget = state.get("contextBudget", {})

    lines: list[str] = []
    a = lines.append

    a("# MEMORY.md - Persistent Context")
    a("")
    a(f"**Last updated:** {datetime.now(timezone.utc).strftime('%Y-%m-%d')}")
    a(f"**Branch:** `{branch}`")
    a(f"**Latest commit:** `{commit}`")
    a(f"**Active module:** `{slug}`")
    a(f"**State file:** `buildplan/agent_state.json`")
    a("")
    a("---")
    a("")
    a("## PROJECT OVERVIEW")
    a("")
    project_desc = state.get("projectDescription", "A project using context engineering.")
    a(project_desc)
    a("")
    a("---")
    a("")
    a("## ACTIVE MODULE")
    a("")
    a("---")
    a("")
    a("## ACTIVE MODULE")
    a("")
    if active:
        a(f"| Field | Value |")
        a(f"|-------|-------|")
        a(f"| Slug | `{active.get('slug', '—')}` |")
        a(f"| Kind | `{active.get('kind', '—')}` |")
        a(f"| Phase | `{active.get('phase', '—')}` |")
        a(f"| Backend | `{active.get('backendStatus', '—')}` |")
        a(f"| Frontend | `{active.get('frontendStatus', '—')}` |")
        a(f"| Started | `{active.get('startedAt', '—')}` |")
        a("")
        tasks = active.get("tasks", {})
        in_progress = tasks.get("inProgress", [])
        if in_progress:
            a("### In Progress")
            for t in in_progress:
                a(f"- [ ] {t}")
            a("")
        nxt = tasks.get("next", [])
        if nxt:
            a("### Next")
            for t in nxt:
                a(f"- {t}")
            a("")
    else:
        a("_No active module._")
        a("")

    a("---")
    a("")
    a("## MODULE STATUS")
    a("")
    if arch:
        a(f"Registry: `{arch.get('registryPath', '—')}` (v{arch.get('registryVersion', '?')})")
        a(f"Total: {arch.get('miniModuleCount', '?')} "
          f"| Implemented: {arch.get('implemented', '?')} "
          f"| Planned: {arch.get('planned', '?')} "
          f"| Gate: {arch.get('gate', '?')}")
        a("")

    if modules:
        a("| Slug | Backend | Frontend | Last Touched |")
        a("|------|---------|----------|--------------|")
        for s, m in sorted(modules.items()):
            a(f"| `{s}` | `{m.get('backendStatus', '?')}` | "
              f"`{m.get('frontendStatus', '?')}` | `{m.get('lastTouched', '—')}` |")
        a("")

    a("---")
    a("")
    a("## LINT GATE")
    a("")
    a(f"Last run: `{lint.get('lastRun', 'never')}`")
    status = '✅' if lint.get('lastPass') else '❌' if lint.get('lastResult') else '⏳'
    a(f"Result: `{status}`")
    if lint.get("lastResult"):
        a(f"Message: `{lint['lastResult']}`")
    a("")
    a("Before module transition: `python additional-modules/scripts/check_gate.py --module <slug>`")
    a("")
    a("---")
    a("")
    a("## CONTEXT BUDGET")
    a("")
    a(f"Hard limit: {budget.get('hardLimit', 64000):,} tokens")
    a(f"Current usage: {budget.get('currentUsage', 0):,} tokens")
    a(f"Remaining: {budget.get('remaining', 64000):,} tokens")
    a(f"Session start: `{budget.get('sessionStart', '—')}`")
    a("")
    a("---")
    a("")
    a("## SESSION ARCHIVES")
    a("")
    a("Index: `additional-modules/work-log/sessions/INDEX.md`")
    archive = sessions.get("archive", [])
    for sid in archive:
        a(f"- `{sid}`")
    current = sessions.get("currentId")
    if current:
        a(f"**Active:** `{current}`")
    a("")
    a("---")
    a("")
    a("## STATE MANAGEMENT")
    a("")
    a("### Files")
    a("- `buildplan/agent_state.json` — **machine-readable** source of truth (agent writes)")
    a("- `buildplan/agent_state.sha256` — integrity checksum")
    a("- `buildplan/context_budget.json` — token budget tracker")
    a("- `MEMORY.md` — **rendered view** (read-only to agent)")
    a("")
    a("### Workflow")
    a("1. Agent updates `agent_state.json` directly")
    a("2. Run `python additional-modules/scripts/render_memory.py` to regenerate `MEMORY.md`")
    a("3. Run `python additional-modules/scripts/check_gate.py --module <slug>` before module transition")
    a("4. Run `python additional-modules/scripts/measure_context.py --tokens <count>` to check budget")
    a("")
    a("---")
    a("")
    a("## AGENT RULES")
    a("")
    a("- MEMORY.md is **read-only** — write to `agent_state.json` instead")
    a("- Hard ~64k token limit with compact procedure")
    a("- Session memory: read MEMORY.md on start, archive + prune on end")
    a("- Terse bullets, no prose")

    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Render MEMORY.md from agent_state.json"
    )
    parser.add_argument(
        "--state",
        default="additional-modules/buildplan/agent_state.json",
        help="Path to agent_state.json (default: additional-modules/buildplan/agent_state.json)",
    )
    parser.add_argument(
        "--out",
        default="MEMORY.md",
        help="Path to write MEMORY.md (default: MEMORY.md)",
    )
    parser.add_argument(
        "--stdout",
        action="store_true",
        help="Print to stdout instead of writing file",
    )
    args = parser.parse_args()

    state = load_state(args.state)
    md = render(state)

    if args.stdout:
        sys.stdout.write(md)
    else:
        resolved = _resolve(args.out)
        out_dir = os.path.dirname(resolved)
        if out_dir:
            os.makedirs(out_dir, exist_ok=True)
        with open(resolved, "w", encoding="utf-8") as f:
            f.write(md)
        print(f"Written: {args.out} (-> {resolved})")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
