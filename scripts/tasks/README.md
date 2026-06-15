# Task-Owned Scripts And Tests

New cross-cutting scripts and tests should be grouped by broad task first, then
by phase. This keeps refactors portable when a task later becomes its own repo.

## Layout

```txt
scripts/tasks/
  <task-name>/
    metadata.json
    phases/
      <phase-id>/
        metadata.json
        *.test.mjs
        *.mjs
```

## Rules

- Use `scripts/tasks/<task-name>/` for new broad efforts.
- Put phase-specific files under `phases/<phase-id>/`.
- Keep a task-level `metadata.json` for ownership, extraction policy, and active
  phases.
- Keep a phase-level `metadata.json` for status, commands, and protected
  behavior.
- Existing legacy scripts stay where they are until touched.
