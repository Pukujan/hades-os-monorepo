# Task-owned work logs

Mirror of task artifacts under `scripts/tasks/<task>/`. Each task has a `work-log/tasks/<task>/` directory that stores:

- `metadata.json` — mirrors the task metadata from `scripts/tasks/<task>/metadata.json`
- `phases/<phase-id>/metadata.json` — phase-specific work-log metadata
- `handoffs/` — mirrored canonical handoff from `work-log/handoffs/<task>/`

## Rules

- Every task in `scripts/tasks/` must have a corresponding entry here.
- Phase metadata here is for work-log tracking (archive status, session references).
- Handoffs are mirrors of the canonical handoff — the canonical source stays in `work-log/handoffs/<task>/` until the task is extracted to its own repo.
