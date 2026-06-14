#!/usr/bin/env python3
"""Watch OpenCode logs for compaction-related events.

Usage:
  python3 additional-modules/scripts/watch_opencode_compaction_logs.py --log /path/to/opencode.log
  opencode 2>&1 | python3 additional-modules/scripts/watch_opencode_compaction_logs.py --stdin
  python3 additional-modules/scripts/watch_opencode_compaction_logs.py --stdin < /path/to/log

Searches for compaction-related keywords and prints matching lines with context.
This script does NOT fake or measure actual compaction — it only filters text.
"""

import argparse
import re
import sys

KEYWORDS = [
    "compact",
    "compaction",
    "prune",
    "summarize",
    "summary",
    "session.compact",
]

# Combined regex for fast matching
_PATTERN = re.compile("|".join(re.escape(k) for k in KEYWORDS), re.IGNORECASE)


def watch_file(path: str) -> None:
    """Tail a log file and print matching lines."""
    import time
    try:
        with open(path, "r", encoding="utf-8") as f:
            # Seek to end for tail behavior
            f.seek(0, 2)
            print(f"Watching: {path} (scanning new lines only)")
            print(f"Keywords: {', '.join(KEYWORDS)}")
            print()
            while True:
                line = f.readline()
                if line:
                    if _PATTERN.search(line):
                        print(line, end="")
                else:
                    time.sleep(0.5)
    except KeyboardInterrupt:
        print("\nStopped.")
    except FileNotFoundError:
        print(f"ERROR: log file not found: {path}", file=sys.stderr)
        sys.exit(1)


def watch_stdin() -> None:
    """Read from stdin and print matching lines."""
    print(f"Watching stdin")
    print(f"Keywords: {', '.join(KEYWORDS)}")
    print()
    try:
        for line in sys.stdin:
            if _PATTERN.search(line):
                print(line, end="")
    except KeyboardInterrupt:
        print("\nStopped.")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Watch OpenCode logs for compaction events"
    )
    parser.add_argument(
        "--log", type=str, default=None,
        help="Path to OpenCode log file (tails new lines)",
    )
    parser.add_argument(
        "--stdin", action="store_true",
        help="Read from stdin instead of a log file",
    )
    args = parser.parse_args()

    if args.log:
        watch_file(args.log)
    elif args.stdin:
        watch_stdin()
    else:
        parser.error("either --log <path> or --stdin is required")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
