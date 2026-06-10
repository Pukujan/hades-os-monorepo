# Planning audit log

Append a **planning-only** audit log inside the active **plan folder** for this slug.

> **Not a study log.** Study logs live under `work-log/study-logs/` for the repo owner only — agents must not read or write them.

## Plan folder layout

Each planning phase gets one dated folder:

```text
work-log/planning/
  {NNN}_{YYYY-MM-DD}_{HH-MM}_{slug}/
    audit-log.md    ← Cursor conversation (You verbatim + Cursor summary)
    plan.md         ← plan package for implementers
    design.md       ← optional
  {same-as-folder-name}.json   ← manifest from npm run plan:finalize
```

Example: `work-log/planning/006_2026-05-31_14-30_cursor-planning-phase/audit-log.md`

Use `{NNN}`, `{YYYY-MM-DD}`, `{HH-MM}` from `formatWorkLogTimestamp()` in `backend/src/shared/utils/formatExchangeTimestamp.js`. `{slug}` is kebab-case summary of the work.

## Rules

1. **No sensitive content** — fixtures, APIs, folder layout, architecture only.
2. **User messages** — verbatim in blockquotes under `### {UTC} · You`.
3. **Assistant** — short bullet summary under `### {UTC} · Cursor`.
4. **Create folder first** if none exists for this slug — include empty or stub `plan.md` in the same folder.
5. **Append vs new folder** — append to `audit-log.md` in the latest folder for the same program id if under ~400 lines; otherwise create a **new dated folder**.
6. **Index** — add a row to `work-log/INDEX.md` when creating a new plan folder.
7. **Scope** — planning-only unless the user says to include implementation.

## Steps

1. Read conversation turns since the last logged entry.
2. Pick program id (e.g. `006`) and slug from the topic.
3. Create or open `work-log/planning/{NNN}_{date}_{time}_{slug}/audit-log.md`.
4. Write or append turns with ISO-8601 UTC timestamps.
5. Confirm the folder path in your reply.

## Optional tags on user turns

- `Program` — pipeline / feature scope (v2)
- `Architecture` — layout / contracts (v3)
