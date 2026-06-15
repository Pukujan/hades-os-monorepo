# Contract: task artifact layout

**Version:** `v001`
**Lint:** `scripts/lint-task-artifacts.mjs`
**Script layout:** `scripts/tasks/`
**Work-log layout:** `work-log/tasks/`

## Purpose

Standardize how cross-cutting scripts, tests, and work-log artifacts are organized by task and phase. This ensures the Hermes boilerplate split (and any future refactor) can be migrated to its own repo by copying whole task directories, not hunting for loose files.

## Scope

Files under `scripts/tasks/` and `work-log/tasks/`. Other script directories (e.g., `scripts/` root-level files) and work-log directories (e.g., `work-log/dev-logs/`) are out of scope.

## Rules

1. Every task has exactly three directories: `scripts/tasks/<task>/`, `work-log/tasks/<task>/`, `docs/tasks/<task>/`.
2. Task directory names must be kebab-case and match across all three trees.
3. Phase directory names must be kebab-case and match within a given task.
4. Every task and phase must have a `metadata.json` with required fields.
5. No file in `scripts/tasks/` may be executable — scripts are run via `node` or `npm run`.

## Required artifacts

- `scripts/tasks/<task>/metadata.json`
- `scripts/tasks/<task>/phases/<phase>/metadata.json`
- `work-log/tasks/<task>/metadata.json`
- `work-log/tasks/<task>/phases/<phase>/metadata.json`

## Enforcement

Automated: `test:repo-architecture` validates task and phase metadata files exist. `lint:contracts` validates manifest paths.

Manual: reviewers must verify new tasks or phases follow the three-directory layout.

## Non-goals

- Enforcing what goes inside phase-specific test files or scripts
- Migrating existing legacy files (tracked in legacy-registry.json)
- Runtime behavior enforcement

## Layout

### Task-owned scripts and tests

```
scripts/tasks/
  README.md
  <task-name>/
    metadata.json              # required — ownership, phases, extraction policy
    phases/
      <phase-id>/
        metadata.json          # required — status, commands, guarded behavior
        *.test.mjs             # phase-specific tests
        *.mjs                  # phase-specific scripts
    (other files as needed)
```

### Task-owned work logs

```
work-log/tasks/
  README.md                    # required — what goes here
  INDEX.md                     # required — index of tasks
  <task-name>/
    metadata.json              # required — mirrors scripts/tasks/<task>/metadata.json
    phases/
      <phase-id>/
        metadata.json          # required — phase-specific work-log metadata
    handoffs/
      handoff.md               # mirror of canonical handoff
      metadata.json            # handoff metadata
```

## Metadata requirements

### Task-level `metadata.json`

| Field | Required | Description |
|-------|----------|-------------|
| `task` | yes | Task slug (matches directory name) |
| `taskType` | yes | `"overall-project"`, `"phase"`, or `"supporting"` |
| `purpose` | yes | One-line description |
| `owner` | yes | Agent key or human slug |
| `status` | yes | `"active"`, `"paused"`, `"complete"`, `"archived"` |
| `activePhases` | yes | Array of phase IDs currently being worked |
| `commands` | no | Array of npm script names for running tests |
| `extractionPolicy` | yes | What to do with this folder if the task becomes its own repo |
| `handoffFolder` | no | Path to canonical handoff in `work-log/handoffs/` |
| `relatedDocs` | no | Array of related doc paths |
| `branch` | no | Branch info (preferred/fallback) |

### Phase-level `metadata.json`

| Field | Required | Description |
|-------|----------|-------------|
| `phase` | yes | Phase slug (matches directory name) |
| `task` | yes | Parent task slug |
| `purpose` | yes | One-line description |
| `owner` | yes | Agent key or human slug |
| `status` | yes | `"red"`, `"green"`, `"in-progress"`, `"blocked"`, `"complete"` |
| `commands` | no | Array of npm script names for running tests |
| `guards` | no | Array of guarded behaviors this phase protects |
| `knownInitialFailures` | no | Array of expected failure descriptions (for red phases) |
| `movePolicy` | no | What to do with this phase folder under extraction |
| `relatedHandoff` | no | Path to handoff for this phase |

## Legacy registry

`work-log/legacy-registry.json` catalogs all work-log files that have not yet been moved under `work-log/tasks/`. Each entry records the file path, its legacy bucket, and a note about its task relationship.

### Required fields per entry

```json
{
  "file": "work-log/handoffs/005_2026-06-12_hermes-runtime-wrapper-tdd.md",
  "bucket": "handoffs",
  "task": null,
  "notes": "Legacy handoff — not yet assigned to a task-artifact task directory"
}
```

### Required buckets

| Bucket | Directory | Description |
|--------|-----------|-------------|
| `handoffs` | `work-log/handoffs/` | Top-level handoff files |
| `planning` | `work-log/planning/` | Planning phase folders |
| `dev-logs-agent` | `work-log/dev-logs/agent/` | Agent dev log entries |
| `dev-logs-human` | `work-log/dev-logs/human/` | Human dev log entries |
| `sessions` | `work-log/sessions/` | Session archives |

## Verification

```bash
npm run lint:task-artifacts
npm run test:task-artifacts
npm run lint:contracts
```
