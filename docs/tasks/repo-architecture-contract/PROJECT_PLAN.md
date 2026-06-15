# Project Plan: repo-architecture-contract

## Scope

Transform the monorepo into a **Contracted Modular Monolith with Repo Catalog and Architecture Fitness Tests**.

### Phases

| Phase | Goal |
|-------|------|
| Phase | Goal | Status |
|-------|------|--------|
| Phase 0 | Project scope and safety metadata | Complete |
| Phase 1 | Red tests defining target architecture state | Complete |
| Phase 2 | Contract documents (`.contract.md` + manifest registration) | Complete |
| Phase 3 | Metadata catalog (`metadata/`) | Complete |
| Phase 4 | Module manifests (`module.json`) | Complete |
| Phase 5 | Generated indexes | Complete |
| Phase 6 | Architecture Enforcement Lints | Complete |
| Phase 7 | Doc Canonicalization & Legacy Registry | Complete |
| Phase 8 | Architecture fitness lints | Complete |
| Phase 9 | Route/API docs drift cleanup | Complete |
| Phase 10 | ADR lifecycle | Complete |
| Phase 11 | CI/final acceptance | Complete |

### Key Deliverables

- `metadata/` directory with canonical JSON files for repo, catalog, modules, tasks, contracts, APIs, architecture fitness, and dependency graph
- `module.json` files in each backend/frontend module directory
- Generated `INDEX.md` files at key documentation roots
- `.contract.md` files for doc source, task artifacts, module metadata, module public API, repo catalog, route manifest, architecture fitness, and ADR lifecycle
- Architecture fitness lints that enforce the contracts
- Root `package.json` scripts for all lints and tests
- `lint:architecture` composite command

### Non-Goals

- Splitting Hades or Hermes
- Changing runtime behavior
- Changing Railway/Vercel deployment
- Changing auth behavior
- Changing Hades UI/product behavior
- Adding Nx/Turborepo
- Creating microservices
- Moving production code for folder aesthetics
