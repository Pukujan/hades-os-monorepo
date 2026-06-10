# Documentation

This folder describes the **modular monolith platform starter** and how **architecture guardrails** keep feature modules isolated and easy to extend.

| Document | Purpose |
| --- | --- |
| [**HTTP API reference**](./API.md) | All backend module endpoints (master index + endpoint registry) |
| [API documentation contract](./architecture/API_DOCUMENTATION_CONTRACT.md) | Required when adding routes (`npm run lint:api-docs`) |
| [Dev log: v2](./DEVLOG_V2.md) | Changes from `main`, contract rationale, benefits/cons, challenges, growth path |
| [Work log / dev-logs](../work-log/dev-logs/) | Per-session **shipped work** — `{NNN}_{date}_{time}_dev-log_{slug}.md`; see [work-log/](../work-log/) |
| [Starter pack](./STARTER_PACK.md) | What ships in the repo, how to run it, and how to add modules |
| [Architecture guardrails](./architecture/ARCHITECTURE_GUARDRAILS.md) | Module contracts, boundaries, naming, and how enforcement works |
| [Module internal contract](./architecture/MODULE_INTERNAL_CONTRACT.md) | MVC layers, prompts, evals, tests inside each feature module |
| [Evals, regression, and CI gates](./architecture/EVAL_AND_CI.md) | Golden evals, `test:evals`, GitHub Actions gates |
| [Publishing the CLI](./PUBLISHING.md) | Release `@pukujan/create-modular-monolith` to npm |
| [Case Filing AI starter](./case-filing-ai/README.md) | Domain blueprint, module split, pipeline, guardrails, and DB schema |

Canonical repository: [https://github.com/Pukujan/litigation-prompt-engineering](https://github.com/Pukujan/litigation-prompt-engineering)
