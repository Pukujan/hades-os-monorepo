# Hermes Core Module Split Handoff

## Task

Split Hades OS into reusable Hermes boilerplate while preserving auth,
Supabase, Railway/Vercel hosting, Hermes runtime, chat, clickable actions, docs,
tests, and dev logs.

Task here means the overall project-sized effort. It should match the branch
intent.

Preferred branch:

```txt
refactor/hermes-core-module-split
```

Fallback branch if Git cannot create the `refactor/` namespace:

```txt
codex/refactor-hermes-core-module-split
```

## Current Phase

`phase-1-portability`

Red tests live at:

```txt
scripts/tasks/hermes-core-module-split/phases/phase-1-portability/portable-hostability.test.mjs
```

Run:

```bash
npm run test:portable
```

Expected red failures before Phase 1 implementation:

```txt
backend/src/core/app.js imports Hades CORS
frontend/src/core/App.jsx imports HadesPrototypeApp
backend/src/modules/auth/tests/integration/authChain.integration.test.js references /api/hades
frontend/src/shared/api/client.js references hades.auth.accessToken
frontend/src/auth/AuthProvider.jsx references hades.auth.accessToken
```

## Folder Convention

Task scripts:

```txt
scripts/tasks/hermes-core-module-split/
```

Task handoffs:

```txt
work-log/handoffs/hermes-core-module-split/
```

New phases should add:

```txt
scripts/tasks/hermes-core-module-split/phases/<phase-id>/metadata.json
```

and update:

```txt
scripts/tasks/hermes-core-module-split/metadata.json
work-log/handoffs/hermes-core-module-split/metadata.json
scripts/script-registry.json
```
