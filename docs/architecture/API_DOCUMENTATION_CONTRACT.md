# API documentation contract

Every **new or changed** HTTP route in `backend/src/modules/*/routes/` must be reflected in markdown **before** the work is considered done (same PR / same change set).

This is enforced by `npm run lint:api-docs` (also part of `npm run lint:architecture`).

---

## Two places to update

| # | File | What to add |
|---|------|-------------|
| 1 | `docs/<module-name>/API.md` | Per-module reference: method, path, description, request/response notes |
| 2 | `docs/API.md` → **Endpoint registry** | One row per route: full path + short description |

Module folder name = docs folder name (e.g. `case-filing-ai` → `docs/case-filing-ai/API.md`).

Base path comes from `app.use("/api/...", router)` in the module’s `index.js`.

---

## 1. Module API (`docs/<module>/API.md`)

### Required for every route

1. **Endpoint quick reference** table (top of file, after the header block):

```markdown
## Endpoint quick reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Module health and config summary |
| POST | `/process-batch` | Upload filings and run the master prompt pipeline |
```

2. **Detailed section** (recommended): `### \`METHOD /path\`` with body fields, response shape, examples.

### Rules

- **Path** column uses the route path **relative to the module base** (starts with `/`), matching Express exactly (including `:param` segments).
- **Description** is one short sentence: what it does, not how it is implemented.
- **Method** is uppercase (`GET`, `POST`, …).
- Do **not** remove old rows when deprecating — mark deprecated routes in the description until removed from code.

### New module

`npm run new:module <name>` scaffolds `docs/<name>/API.md` with a health row. Append rows when you add routes.

---

## 2. Consolidated registry (`docs/API.md`)

Under `## Endpoint registry`, append one row per route:

```markdown
| POST | `/api/case-filing-ai/process-batch` | Case Filing AI | Upload filings and run master prompt |
```

| Column | Content |
|--------|---------|
| Method | HTTP verb |
| Path | Full path including `/api/<module-id>` |
| Module | Human label (match module index table) |
| Description | Same intent as module doc (can be slightly shorter) |

Keep rows **sorted by module**, then method, then path.

The **Module index** table (above the registry) must list every loaded module; stub modules stay “Health only” until domain routes ship.

---

## 3. Optional but encouraged

| Artifact | When |
|----------|------|
| `frontend/src/modules/<module>/api/*.js` | Wrapper for UI callers |
| Integration test under `tests/integration/` | Exercises the route |
| `backend/.env.example` | New env vars |

---

## 4. Checklist (copy when adding a route)

```text
[ ] Route in backend/src/modules/<module>/routes/
[ ] Row in docs/<module>/API.md (quick reference + detail section)
[ ] Row in docs/API.md → Endpoint registry
[ ] npm run lint:api-docs passes
```

---

## 5. Enforcement

```bash
npm run lint:api-docs          # repo root or backend/
npm run lint:architecture      # includes api-docs
```

The linter compares Express `router.get/post/...` registrations to:

- Path (+ method) in `docs/<module>/API.md`
- Full path (+ method) in `docs/API.md` endpoint registry

---

## Related

- [Master API index](../API.md)
- [Module internal contract](./MODULE_INTERNAL_CONTRACT.md)
- [Architecture guardrails](./ARCHITECTURE_GUARDRAILS.md)
