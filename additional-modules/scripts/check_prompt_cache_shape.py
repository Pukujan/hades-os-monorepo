#!/usr/bin/env python3
"""check_prompt_cache_shape.py — verify AGENTS.md is shaped for provider cache reuse.

Does NOT measure real cache hit rate (that requires provider/runtime logs).
Instead, verifies that the repo input contract is structured so that:
  - The stable prefix rarely changes between sessions.
  - Task/session-specific content is below the stable contract.
  - The documented boot order enables cache reuse.

Usage:
    python3 additional-modules/scripts/check_prompt_cache_shape.py [--quiet]

Exits 0 when shape is cache-friendly; non-zero otherwise.

Checks:
  L1 — Deterministic repo checks:
    1. Cache Policy heading exists and is near the top of AGENTS.md.
    2. Operator Notes are below core agent rules (not near the top).
    3. No task-specific section headings in the stable prefix.
    4. Stable boot order is documented.
    5. Cache hit rate measurement note exists
       (additional-modules/scripts/measure_opencode_cache_run.md).
"""

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
AGENTS_PATH = REPO_ROOT / "AGENTS.md"
CACHE_MEASURE_DOC = (
    REPO_ROOT / "additional-modules" / "scripts" / "measure_opencode_cache_run.md"
)

STABLE_BOOT_ORDER_TERMS = [
    "AGENTS.md",
    "MEMORY.md",
    "current task",
    "current errors",
]


def read_file(path: Path) -> str:
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8")


def check_cache_policy_near_top(content: str) -> list[str]:
    errors: list[str] = []
    lines = content.split("\n")

    # Cache Policy should be in the first 15 non-empty lines
    found = False
    for i, line in enumerate(lines[:30]):
        if re.match(r"^## Cache Policy", line):
            found = True
            if i > 15:
                errors.append(
                    f"Cache Policy found at line {i + 1} — should be earlier (within first ~15 lines)"
                )
            break

    if not found:
        errors.append("## Cache Policy heading not found in AGENTS.md")
    return errors


def check_operator_notes_below_core(content: str) -> list[str]:
    errors: list[str] = []

    # Find all h1 headings
    h1_pattern = re.compile(r"^(# \d+\. .+)$", re.MULTILINE)
    h1_headings = [(m.group(1).strip(), m.start()) for m in h1_pattern.finditer(content)]

    if not h1_headings:
        errors.append("no numbered h1 headings found")
        return errors

    # The first core section should be # 1. Prime Directive
    # The last core section should be # N. (something) before Operator Notes
    # Operator Notes should be the last numbered section
    op_notes_idx = None
    core_section_indices = []
    for i, (heading, pos) in enumerate(h1_headings):
        if "Operator Notes" in heading:
            op_notes_idx = i
        else:
            core_section_indices.append((heading, pos, i))

    if op_notes_idx is None:
        errors.append("'# N. Operator Notes' heading not found")
        return errors

    # Operator Notes must not be the first numbered section
    if op_notes_idx == 0:
        errors.append(
            "Operator Notes is the first numbered section — must be below core rules"
        )

    # All core sections must come before Operator Notes
    for heading, pos, idx in core_section_indices:
        if idx > op_notes_idx:
            errors.append(
                f"core heading '{heading}' appears after Operator Notes"
            )

    return errors


def check_no_task_headings_in_prefix(content: str) -> list[str]:
    errors: list[str] = []

    op_notes_match = re.search(r"^# \d+\.\s*Operator Notes", content, re.MULTILINE)
    if not op_notes_match:
        return errors  # Handled by other check

    prefix = content[: op_notes_match.start()]

    task_patterns = [
        r"^#+\s*Current\s+Task",
        r"^#+\s*Current\s+Bug",
        r"^#+\s*Current\s+Error",
        r"^#+\s*Today\b",
        r"^#+\s*Screenshot",
        r"^#+\s*Acceptance\s+Criteria",
    ]

    # Exception: "current task" may appear generically inside Cache Policy
    cache_start = None
    cache_end = None
    cache_match = re.search(r"^## Cache Policy", prefix, re.MULTILINE)
    if cache_match:
        cache_start = cache_match.start()
        next_h1 = re.search(r"^# 1\. ", prefix[cache_match.end() :], re.MULTILINE)
        if next_h1:
            cache_end = cache_match.end() + next_h1.start()

    for pattern in task_patterns:
        for m in re.finditer(pattern, prefix, re.MULTILINE):
            heading_text = m.group().strip()
            if (
                "current task" in heading_text.lower()
                and cache_start is not None
                and cache_start <= m.start() <= (cache_end or len(prefix))
            ):
                continue
            errors.append(
                f"task heading '{heading_text}' in stable prefix (before Operator Notes)"
            )

    return errors


def check_stable_boot_order_documented(content: str) -> list[str]:
    errors: list[str] = []

    # The stable boot order should be mentioned: AGENTS.md, MEMORY.md, current task, etc.
    for term in STABLE_BOOT_ORDER_TERMS:
        if term not in content:
            errors.append(f"boot-order term '{term}' not found in AGENTS.md")

    # Also check that the cache policy section mentions the boot order
    cache_section_match = re.search(
        r"^## Cache Policy.*?(?=^# \d+\. |^## |\Z)", content, re.MULTILINE | re.DOTALL
    )
    cache_section = cache_section_match.group(0) if cache_section_match else ""
    boot_mentions = sum(
        1 for t in STABLE_BOOT_ORDER_TERMS[:2] if t in cache_section
    )  # at least AGENTS.md and MEMORY.md in cache section
    if boot_mentions < 2:
        errors.append("stable boot order not clearly documented in cache policy section")

    return errors


def check_cache_measure_doc_exists() -> list[str]:
    errors: list[str] = []
    if not CACHE_MEASURE_DOC.exists():
        errors.append(
            f"cache measurement doc not found: {CACHE_MEASURE_DOC}"
        )
    return errors


def main() -> int:
    content = read_file(AGENTS_PATH)
    if not content:
        print(f"ERROR: {AGENTS_PATH} not found or empty")
        return 1

    quiet = "--quiet" in sys.argv
    all_errors: list[str] = []
    tests_pass = 0
    tests_fail = 0
    total = 5

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
        print(f"Checking cache shape: {AGENTS_PATH}")
        print()

    # L1-1
    errors = check_cache_policy_near_top(content)
    log_result("L1-1 — Cache Policy near top", errors)
    all_errors.extend(errors)

    # L1-2
    errors = check_operator_notes_below_core(content)
    log_result("L1-2 — Operator Notes below core rules", errors)
    all_errors.extend(errors)

    # L1-3
    errors = check_no_task_headings_in_prefix(content)
    log_result("L1-3 — No task headings in stable prefix", errors)
    all_errors.extend(errors)

    # L1-4
    errors = check_stable_boot_order_documented(content)
    log_result("L1-4 — Stable boot order documented", errors)
    all_errors.extend(errors)

    # L1-5
    errors = check_cache_measure_doc_exists()
    log_result("L1-5 — Cache-measure doc exists", errors)
    all_errors.extend(errors)

    print()
    print(f"Results: {tests_pass}/{total} passed, {tests_fail}/{total} failed")

    if all_errors:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
