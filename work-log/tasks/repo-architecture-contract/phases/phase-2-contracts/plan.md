# Phase 2 Plan: Contract Documents and Registration

## Goal

TDD-implement 8 contract documents that define the contracted modular monolith architecture, register them in the contract manifest, and update architecture documentation.

## Steps

1. Create Phase 2 test files (contract-docs.test.mjs, phase-0-1-regression.test.mjs)
2. Create Phase 2 work-log files (metadata.json, plan.md, test-plan.md, audit-log.md)
3. Update package.json test:repo-architecture script to include Phase 2 tests
4. Run tests — confirm Phase 2 fails and Phase 0/1 regression passes (TDD red)
5. Create 8 contract docs in docs/architecture/contracts/
6. Register contracts in manifest.json + changelog.jsonl
7. Update CONTRACTS_OVERVIEW.md and REPO_ARTIFACT_LAYOUT.md
8. Run tests — confirm Phase 2 passes and Phase 0/1 regression still passes (TDD green)
9. Run lint:repo-architecture:red, lint:contracts, lint:boundaries
10. Update agent_state.json and MEMORY.md

## Contracts to Create

| # | Contract File | Purpose |
|---|--------------|---------|
| 1 | docCanonicalSource.contract.md | Docs live in a single tree; no duplication across docs/ and additional-modules/docs/ |
| 2 | taskArtifactLayout.contract.md | Task metadata, scripts, work-log, and docs layout |
| 3 | moduleMetadata.contract.md | module.json fields and validation |
| 4 | modulePublicApi.contract.md | Public API surface rules for modular boundaries |
| 5 | repoCatalog.contract.md | metadata/*.json catalog generation rules |
| 6 | routeManifest.contract.md | route registration conventions |
| 7 | architectureFitness.contract.md | Architecture fitness function contracts |
| 8 | adrLifecycle.contract.md | ADR creation, metadata, and lifecycle rules |
