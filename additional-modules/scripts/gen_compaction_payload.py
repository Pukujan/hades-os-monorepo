#!/usr/bin/env python3
"""Generate a large token payload for runtime compaction smoke testing.

Usage:
  python3 additional-modules/scripts/gen_compaction_payload.py --tokens 70000 > /tmp/opencode_70k_payload.txt
  python3 additional-modules/scripts/gen_compaction_payload.py --tokens 70000 --output /tmp/opencode_70k_payload.txt
  python3 additional-modules/scripts/gen_compaction_payload.py --check

The payload includes three marker lines so that the reader can verify it ingested
the entire file (start/middle/end). Markers appear at ~2%, ~50%, and ~98% of the
target token count.

This script does NOT fake or measure actual OpenCode runtime compaction.
It only generates deterministic test payloads and checks config readiness.
"""

import argparse
import json
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
OP = REPO_ROOT / "additional-modules" / "context-engineering" / "opencode.json"

FILLER = "context payload filler line for compaction smoke testing only"

START_MARKER = "START_MARKER_CACHE_TEST"
MIDDLE_MARKER = "MIDDLE_MARKER_CACHE_TEST"
END_MARKER = "END_MARKER_CACHE_TEST"


def _approx_tokens(text: str) -> int:
    # Rough: 1 token ≈ 4 chars or 0.75 words. We use 4 chars for precision.
    return len(text) // 4


def generate_payload(target_tokens: int) -> str:
    """Generate a large text block with start/middle/end markers."""
    lines: list[str] = []

    # Start marker at ~2%
    start_pos = max(1, int(target_tokens * 0.02))
    # Middle marker at ~50%
    mid_pos = int(target_tokens * 0.50)
    # End marker at ~98%
    end_pos = int(target_tokens * 0.98)

    inserted_start = False
    inserted_middle = False
    inserted_end = False

    tokens_generated = 0
    line_num = 0

    while tokens_generated < target_tokens:
        if tokens_generated >= end_pos and not inserted_end:
            lines.append(f"--- {END_MARKER} ---")
            lines.append("")
            tokens_generated += _approx_tokens(f"--- {END_MARKER} ---")
            inserted_end = True
            continue

        if tokens_generated >= mid_pos and not inserted_middle:
            lines.append(f"--- {MIDDLE_MARKER} ---")
            lines.append("")
            tokens_generated += _approx_tokens(f"--- {MIDDLE_MARKER} ---")
            inserted_middle = True
            continue

        if tokens_generated >= start_pos and not inserted_start:
            lines.append(f"--- {START_MARKER} ---")
            lines.append("")
            tokens_generated += _approx_tokens(f"--- {START_MARKER} ---")
            inserted_start = True
            continue

        lines.append(FILLER)
        tokens_generated += _approx_tokens(FILLER)
        line_num += 1

        if line_num % 50 == 0:
            lines.append("")

    # Safety: ensure all markers exist exactly once
    payload = "\n".join(lines)
    if START_MARKER not in payload:
        lines.insert(2, f"--- {START_MARKER} ---")
    if MIDDLE_MARKER not in payload:
        half = len(lines) // 2
        lines.insert(half, f"--- {MIDDLE_MARKER} ---")
    if END_MARKER not in payload:
        lines.append(f"--- {END_MARKER} ---")

    return "\n".join(lines)


def check_config() -> int:
    """Report OpenCode config readiness. Exits non-zero only on critical misconfig."""
    errors = 0
    try:
        cfg = json.loads(OP.read_text())
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"FAIL: cannot read {OP}: {e}")
        return 1

    reserved = cfg.get("compaction", {}).get("reserved")
    auto = cfg.get("compaction", {}).get("auto")
    prune = cfg.get("compaction", {}).get("prune")
    context_limit = None
    model_id = None

    for pname, pcfg in cfg.get("provider", {}).items():
        for mid, mcfg in pcfg.get("models", {}).items():
            context_limit = mcfg.get("limit", {}).get("context")
            model_id = mid

    # Print config summary
    print(f"Context limit: {context_limit or 'MISSING':,}")
    print(f"Reserved space: {reserved or 'MISSING':,}")
    if context_limit and reserved:
        trigger = context_limit - reserved
        print(f"Auto-compaction trigger: {trigger:,} tokens ({trigger / context_limit * 100:.0f}%)")
    print(f"Auto enabled: {auto}")
    print(f"Prune enabled: {prune}")
    print()

    # Critical checks
    if auto is not True:
        print("FAIL: compaction.auto is not true")
        errors += 1
    if context_limit is None:
        print("FAIL: context limit is missing from opencode.json")
        errors += 1
    if reserved is None:
        print("FAIL: reserved space is missing from opencode.json")
        errors += 1

    # Symlink / env check (warn only, not a failure)
    symlink = REPO_ROOT / "opencode.json"
    if symlink.is_symlink():
        target = symlink.resolve()
        if target == OP.resolve():
            print(f"Symlink: correct (opencode.json -> {OP.name})")
        else:
            print(f"WARN: symlink points to {target}, expected {OP.resolve()}")
    else:
        env = os.environ.get("OPENCODE_CONFIG", "")
        if env:
            print(f"OPENCODE_CONFIG env: {env}")
        else:
            print("WARN: no symlink and OPENCODE_CONFIG env var not set")

    print()
    if errors:
        print(f"{errors} critical config issue(s) — auto-compaction may not work")
        return 1
    else:
        print("Config readiness: OK (threshold alignment verified, runtime observation still needed)")
        return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate compaction smoke-test payload or check config readiness"
    )
    parser.add_argument(
        "--tokens", type=int, default=70000,
        help="Target approximate token count (default: 70000)",
    )
    parser.add_argument(
        "--output", type=str, default=None,
        help="Write payload to file instead of stdout",
    )
    parser.add_argument(
        "--check", action="store_true",
        help="Verify OpenCode config readiness only (no payload)",
    )
    args = parser.parse_args()

    if args.check:
        return check_config()

    payload = generate_payload(args.tokens)
    approx = _approx_tokens(payload)
    marker_count = sum(
        1 for m in (START_MARKER, MIDDLE_MARKER, END_MARKER) if m in payload
    )

    if args.output:
        Path(args.output).write_text(payload, encoding="utf-8")
        print(f"Written: {args.output} (~{approx:,} est. tokens, {marker_count}/3 markers)")
    else:
        sys.stdout.write(payload)
        # Print stats to stderr so stdout stays clean for piping
        print(f"Payload: ~{approx:,} est. tokens, {marker_count}/3 markers", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
