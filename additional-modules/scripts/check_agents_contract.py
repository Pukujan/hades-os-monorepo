#!/usr/bin/env python3
"""check_agents_contract.py — verify AGENTS.md preserves required contract rules.

Usage:
    python3 additional-modules/scripts/check_agents_contract.py [--quiet]

Exits 0 when all checks pass; non-zero when any required rule is missing
or the cache-stable section ordering is broken.

Checks:
  1. Required file paths preserved (7 files)
  2. Required commands preserved (8 commands)
  3. Context numbers preserved (5 values)
  4. Section heading order (cache policy before operator notes)
  5. No task-specific headings in stable prefix
  6. Output contract fields preserved (5 fields)
"""

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
AGENTS_PATH = REPO_ROOT / "AGENTS.md"

REQUIRED_FILES = [
    "additional-modules/buildplan/agent_state.json",
    "additional-modules/buildplan/agent_state.sha256",
    "MEMORY.md",
    "additional-modules/buildplan/context_budget.json",
    "additional-modules/work-log/sessions/",
    "additional-modules/work-log/sessions/INDEX.md",
    "additional-modules/context-engineering/opencode.json",
]

REQUIRED_COMMANDS = [
    "python3 additional-modules/scripts/measure_context.py --tokens 0 --start-session",
    "python3 additional-modules/scripts/measure_context.py --status",
    "python3 additional-modules/scripts/render_memory.py",
    "python3 additional-modules/scripts/measure_context.py --archive-session --slug <slug> --tokens <count>",
    "python3 additional-modules/scripts/check_gate.py --module <slug>",
    "node additional-modules/context-engineering/bin/context-eng.js init --opencode",
    'export OPENCODE_CONFIG="$PWD/additional-modules/context-engineering/opencode.json"',
    "ln -sf additional-modules/context-engineering/opencode.json opencode.json",
]

REQUIRED_NUMBERS = {
    "64,000": "context ceiling (comma format)",
    "64000": "context ceiling (raw)",
    "57600": "compact threshold",
    "4000": "reserved compaction space",
    "warn-only": "warn-only policy",
}

REQUIRED_HEADING_ORDER = [
    "## Cache Policy",
    "# 1. Prime Directive",
    "# 2. State Management",
    "# 3. Context Budget",
    "# 4. OpenCode Context Policy",
    "# 10. Operator Notes",
]

OUTPUT_CONTRACT_FIELDS = [
    "Files changed",
    "Commands run",
    "Tests/checks run",
    "State updates made",
    "Remaining risks",
]

TASK_HEADING_PATTERNS = [
    r"#+\s*Current\s+Task",
    r"#+\s*Current\s+Bug",
    r"#+\s*Current\s+Error",
    r"#+\s*Today\b",
    r"#+\s*Screenshot",
    r"#+\s*Acceptance\s+Criteria",
]


def read_agents() -> str:
    if not AGENTS_PATH.exists():
        print(f"ERROR: {AGENTS_PATH} not found")
        return ""
    return AGENTS_PATH.read_text(encoding="utf-8")


def check_required_files(content: str) -> list[str]:
    missing = []
    for f in REQUIRED_FILES:
        if f not in content:
            missing.append(f)
    return missing


def check_required_commands(content: str) -> list[str]:
    missing = []
    for cmd in REQUIRED_COMMANDS:
        if cmd not in content:
            missing.append(cmd)
    return missing


def check_required_numbers(content: str) -> list[str]:
    missing = []
    for num, label in REQUIRED_NUMBERS.items():
        if num not in content:
            missing.append(f"{num} ({label})")
    return missing


def check_heading_order(content: str) -> list[str]:
    errors = []
    heading_pattern = re.compile(r"^(#+\s+.+)$", re.MULTILINE)
    headings = [m.group(1).strip() for m in heading_pattern.finditer(content)]

    # Build a map of required heading -> its index in the document
    required_indices = {}
    for req in REQUIRED_HEADING_ORDER:
        norm = req.strip()
        try:
            required_indices[req] = headings.index(norm)
        except ValueError:
            errors.append(f"heading missing: {req}")

    # Check ordering among found required headings
    found = sorted(required_indices.items(), key=lambda x: x[1])
    expected_order = [h for h in REQUIRED_HEADING_ORDER if h in required_indices]
    actual_order = [h for h, _ in found]
    if actual_order != expected_order:
        errors.append(
            f"heading order incorrect — expected order: {expected_order}, got: {actual_order}"
        )

    # Operator Notes must come after all core agent rules (sections 1-9)
    # Check that no section 2-9 heading appears after section 10
    core_sections = {f"# {i}. " for i in range(2, 10)}
    op_notes_idx = None
    for i, h in enumerate(headings):
        if h == "# 10. Operator Notes":
            op_notes_idx = i
            break

    if op_notes_idx is not None:
        for i, h in enumerate(headings):
            if i > op_notes_idx:
                for prefix in core_sections:
                    if h.startswith(prefix):
                        errors.append(
                            f"core section '{h}' found after '# 10. Operator Notes'"
                        )

    return errors


def check_no_task_headings_in_prefix(content: str) -> list[str]:
    errors = []
    # Find the position of "# 10. Operator Notes"
    op_notes_match = re.search(r"^# 10\.\s*Operator Notes", content, re.MULTILINE)
    if not op_notes_match:
        errors.append("cannot check task headings — '# 10. Operator Notes' not found")
        return errors

    prefix = content[: op_notes_match.start()]

    # Find the Cache Policy section boundaries (for the "current task" exception)
    cache_start = None
    cache_end = None
    cache_match = re.search(r"^## Cache Policy", prefix, re.MULTILINE)
    if cache_match:
        cache_start = cache_match.start()
        # Cache Policy ends at the next h1 heading
        next_h1 = re.search(r"^# 1\. ", prefix[cache_match.end() :], re.MULTILINE)
        if next_h1:
            cache_end = cache_match.end() + next_h1.start()

    for pattern in TASK_HEADING_PATTERNS:
        for m in re.finditer(pattern, prefix, re.MULTILINE):
            # Exception: "current task" mention inside cache policy is allowed
            if "current task" in m.group().lower() and cache_start is not None:
                if cache_start <= m.start() <= (cache_end or len(prefix)):
                    continue
            errors.append(
                f"task-specific heading '{m.group().strip()}' found before '# 10. Operator Notes' at line ~{prefix[:m.start()].count(chr(10)) + 1}"
            )

    return errors


def check_output_contract(content: str) -> list[str]:
    missing = []
    for field in OUTPUT_CONTRACT_FIELDS:
        if field not in content:
            missing.append(field)
    return missing


def main() -> int:
    content = read_agents()
    if not content:
        return 1

    all_errors: list[str] = []
    tests_pass = 0
    tests_fail = 0
    total = 6

    quiet = "--quiet" in sys.argv

    def log_result(name: str, errors: list[str]):
        nonlocal tests_pass, tests_fail
        if errors:
            tests_fail += 1
            print(f"  FAIL: {name}")
            for e in errors:
                print(f"    - {e}")
        else:
            tests_pass += 1
            if not quiet:
                print(f"  PASS: {name}")

    if not quiet:
        print(f"Checking: {AGENTS_PATH}")
        print()

    # Test 1
    missing_files = check_required_files(content)
    log_result("Test 1 — Required files preserved", missing_files)
    all_errors.extend(missing_files)

    # Test 2
    missing_cmds = check_required_commands(content)
    log_result("Test 2 — Required commands preserved", missing_cmds)
    all_errors.extend(missing_cmds)

    # Test 3
    missing_nums = check_required_numbers(content)
    log_result("Test 3 — Context numbers preserved", missing_nums)
    all_errors.extend(missing_nums)

    # Test 4
    heading_errors = check_heading_order(content)
    log_result("Test 4 — Cache policy before operator notes", heading_errors)
    all_errors.extend(heading_errors)

    # Test 5
    task_heading_errors = check_no_task_headings_in_prefix(content)
    log_result("Test 5 — No task headings in stable prefix", task_heading_errors)
    all_errors.extend(task_heading_errors)

    # Test 6
    missing_output = check_output_contract(content)
    log_result("Test 6 — Output contract preserved", missing_output)
    all_errors.extend(missing_output)

    print()
    print(f"Results: {tests_pass}/{total} passed, {tests_fail}/{total} failed")

    if all_errors:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
