# Phase 8 Test Plan

## Test Cases (11)

| # | Test | Expected | Validates |
|---|------|----------|-----------|
| 1 | Architecture fitness lint script exists | scripts/core/lint-architecture-fitness.mjs exists | File creation |
| 2 | Package scripts register architecture fitness lint | lint:architecture-fitness in package.json, included in lint:repo-architecture | Script registration |
| 3 | Architecture fitness metadata lists implemented and deferred checks | metadata/architecture-fitness.json has doc-canonical-source, task-artifacts, module-metadata, repo-catalog, dependency-graph as implemented; route/API docs as deferred to Phase 9 | Metadata restructuring |
| 4 | Architecture fitness lint does not call lint:api-docs | No reference to lint:api-docs in lint script or package script | Scope boundary |
| 5 | Dependency graph has no cycles | dependency-graph.json nodes/edges arrays are present and cycle-free | Graph validity |
| 6 | Architecture fitness lint runs successfully | npm run lint:architecture-fitness exits 0 | Lint execution |
| 7 | Repo architecture lint remains green | npm run lint:repo-architecture exits 0 | Composite remains green |
| 8 | Phase 8 work-log artifacts exist | metadata.json, plan.md, test-plan.md, audit-log.md all present | Work-log completeness |
| 9 | Project plan marks Phase 7 complete and Phase 8 present | PROJECT_PLAN.md has Phase 7→Complete, Phase 8→Complete | Plan alignment |
