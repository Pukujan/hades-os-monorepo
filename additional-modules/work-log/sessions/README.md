# Session archives

Compact summaries of work sessions — what we worked on, decisions made, and follow-ups.

**Difference from dev-logs:** Dev-logs (`dev-logs/`) are per-push audits of what shipped. Sessions (`sessions/`) are per-session records of work, context, and decisions.

## Layout

```text
work-log/sessions/
  INDEX.md                        ← lookup table of all sessions
  2026-06-06-audit-and-memory-setup.md   ← archived session
```

## Naming convention

```text
{YYYY-MM-DD}-{slug}.md
```

| Part | Example |
|------|---------|
| Date | `2026-06-06` |
| Slug | `audit-and-memory-setup` (kebab-case) |

## Session format

Each file contains:
- **Metadata:** date, branch, commit, duration
- **What Shipped:** bullet points of completed work
- **Decisions Made:** key decisions during the session
- **Follow-ups:** items carried to next session
- **Files Created/Changed:** paths of affected files
