# Acceptance Criteria: repo-architecture-contract

## Final Milestone Acceptance Commands

```bash
npm run test:repo-architecture
npm run lint:contracts
npm run lint:repo-artifacts
npm run lint:deploy
npm run test:deploy
```

## Phase 0 / Phase 1 Note

Phase 0 and Phase 1 are **scaffolding and red tests only**.

The `test:repo-architecture` command is expected to fail because the red tests define a target architecture state that later phases will implement.

Green status for all commands above is the final milestone goal, not the Phase 1 goal.

## Final Green Targets

- `npm run test:repo-architecture` — all checks pass
- `npm run lint:contracts` — all contract paths exist
- `npm run lint:repo-artifacts` — all required repo artifacts present
- `npm run lint:deploy` — deploy artifacts valid
- `npm run test:deploy` — deploy tests pass
- `npm run lint:repo-architecture:red` — red/audit checks run without errors (may report expected gaps)

## Runtime/Deployment Safety

- Runtime behavior unchanged: yes
- Deployment behavior unchanged: yes
