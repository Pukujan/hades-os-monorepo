# Handoff #024 - OpenCode FastAPI Modular Contract Migration

Date: 2026-06-20

Audience: OpenCode implementation agent

Status: ready for red-first implementation in a new repo

## Mission

Create the new FastAPI backend repository and port Hades/Hermes using the same modular contract discipline as the current Express monorepo.

This is not a freeform rewrite.

The goal is:

- Preserve Hades/Hermes behavior.
- Preserve module boundaries.
- Preserve TDD.
- Preserve docs/API contract enforcement.
- Improve the backend shape with FastAPI `APIRouter`, `Depends`, Pydantic schemas, OpenAPI, and Python-native Modal/Daytona integration seams.

## Read First

Read these in the current repo before writing code:

```text
AGENTS.md
MEMORY.md
docs/hades/DAYTONA_MODAL_FASTAPI_MIGRATION_STUDY.md
work-log/planning/014_2026-06-20_daytona-modal-fastapi-migration-plan.md
work-log/planning/015_2026-06-20_fastapi-modular-contract-migration-plan.md
docs/hermes-agent/user-guide/profiles.md
docs/hermes-agent/user-guide/features/api-server.md
docs/hermes-agent/user-guide/docker.md
docs/hermes-agent/user-guide/sessions.md
backend/scripts/check-module-boundaries.mjs
backend/scripts/check-module-layers.mjs
scripts/check-api-docs.mjs
```

FastAPI docs to use as primary reference:

```text
https://fastapi.tiangolo.com/tutorial/bigger-applications/
https://fastapi.tiangolo.com/tutorial/dependencies/
https://fastapi.tiangolo.com/tutorial/testing/
https://fastapi.tiangolo.com/tutorial/metadata/
```

## Critical Hermes Facts

Do not improvise these:

- A Hermes profile is a separate `HERMES_HOME`.
- Each profile owns its own `config.yaml`, `.env`, `SOUL.md`, memories, sessions, skills, cron jobs, gateway state, and `state.db`.
- Profiles are not OS sandboxes.
- `SOUL.md` changes take effect cleanly on a new session.
- Hermes session history is stored in SQLite `state.db`.
- The Hermes API server is OpenAI-compatible.
- `/v1/responses` supports `previous_response_id` and named `conversation`.
- Hermes Docker state lives in durable `/opt/data`.
- Do not run two Hermes gateway containers/process owners against the same data directory at the same time.

## Red Tests Already Written

Two migration test scripts were added to the current repo.

### Static modular contract test

```text
scripts/hades-fastapi-modular-contract.red.test.mjs
```

Command:

```bash
HADES_FASTAPI_REPO=<absolute-or-relative-path-to-new-repo> npm run test:fastapi-migration-red
```

Expected before implementation:

```text
FAIL
Missing FastAPI migration repo
```

This test verifies:

- FastAPI repo skeleton.
- `pyproject.toml` dependencies.
- `app/main.py` app factory.
- module registry / manifests.
- required modules: `auth`, `hades`, `hermes`, `media`, `workers`.
- thin route handlers.
- module boundary/layer/API-doc lint scripts.
- native pytest contract tests.
- Hermes profile runtime files.
- Hades/Hermes API docs routes.
- no forbidden browser secret fields in response schemas.

### Running API E2E test

```text
scripts/hades-fastapi-migration-e2e.tdd.test.mjs
```

Command:

```bash
HADES_FASTAPI_BASE_URL=http://127.0.0.1:8000 \
HADES_FASTAPI_E2E_AUTH_TOKEN=<test-token> \
npm run test:fastapi-migration-e2e
```

Behavior:

- Skips unless `HADES_FASTAPI_BASE_URL` is set.
- Verifies `/health`.
- Verifies `/openapi.json`.
- Verifies OpenAPI routes.
- Verifies unauthenticated session bootstrap fails closed.
- Verifies authenticated session bootstrap returns an edge route only.
- Verifies media upload returns a retrievable attachment route.

## New Repo Target Shape

Create:

```text
hades-os-fastapi/
  pyproject.toml
  README.md
  docs/
    API.md
    architecture/
      MODULAR_CONTRACTS.md
    hades/
      API.md
  app/
    __init__.py
    main.py
    module_registry.py
    shared/
      __init__.py
      settings.py
      http/
        __init__.py
        errors.py
      contracts/
        __init__.py
        module_manifest.py
    modules/
      __init__.py
      auth/
        __init__.py
        manifest.py
        routes.py
        schemas.py
        services.py
        dependencies.py
        repositories.py
        adapters.py
        domain.py
      hades/
        __init__.py
        manifest.py
        routes.py
        schemas.py
        services.py
        dependencies.py
        repositories.py
        adapters.py
        domain.py
      hermes/
        __init__.py
        manifest.py
        routes.py
        schemas.py
        services.py
        dependencies.py
        profile_registry.py
        profile_provisioner.py
        profile_session_broker.py
        edge_auth_proxy.py
        gateway_process_manager.py
      media/
        __init__.py
        manifest.py
        routes.py
        schemas.py
        services.py
        dependencies.py
        repositories.py
        adapters.py
        domain.py
      workers/
        __init__.py
        manifest.py
        routes.py
        schemas.py
        services.py
        dependencies.py
        repositories.py
        adapters.py
        domain.py
  scripts/
    check_module_boundaries.py
    check_module_layers.py
    check_api_docs.py
  tests/
    contracts/
      test_module_boundaries.py
      test_module_layers.py
      test_openapi_registry.py
      test_secret_leakage.py
      test_hermes_profile_contract.py
    unit/
    e2e/
```

## Modular Contract Mapping

Use this mapping exactly:

| Current Express monorepo | New FastAPI repo |
|---|---|
| module `index.js` | module `manifest.py` |
| Express router | FastAPI `APIRouter` |
| route factory params | FastAPI dependency providers |
| `services/` | `services.py` or `services/` package |
| `repositories/` | `repositories.py` or `repositories/` package |
| `adapters/` | `adapters.py` or `adapters/` package |
| `domain/` | `domain.py` or `domain/` package |
| test helper `invokeApp` | FastAPI `TestClient` / `httpx.AsyncClient` |
| source route doc lint | OpenAPI route registry lint |
| JS import lint | Python AST import lint |
| env injection | Pydantic settings + dependency providers |

## Implementation Sequence

### Step 1 - Bootstrap New Repo

Create the repo and toolchain.

Minimum `pyproject.toml` requirements:

```text
fastapi
uvicorn
pydantic
pydantic-settings
pytest
pytest-asyncio or anyio
httpx
ruff
```

Expose commands equivalent to:

```text
lint:boundaries
lint:layers
lint:api-docs
lint:architecture
test
```

Use any Python task runner you prefer, but the command names must appear in `pyproject.toml` because the red contract checks for them.

### Step 2 - Add App Factory And Module Registry

Create `app/main.py` with:

- `create_app()`
- `FastAPI(...)`
- `/health`
- router inclusion from `app/module_registry.py`

Do not import feature route modules directly in `main.py`.

Good pattern:

```python
from fastapi import FastAPI

from app.module_registry import get_enabled_modules

def create_app() -> FastAPI:
    app = FastAPI(title="Hades OS API")
    for module in get_enabled_modules():
        app.include_router(module.router, prefix=module.prefix, tags=module.tags)
    return app

app = create_app()
```

### Step 3 - Add Module Manifest Contract

Create `app/shared/contracts/module_manifest.py`.

Manifest should include:

- `name`
- `prefix`
- `router`
- `tags`
- optional `dependencies`
- optional `health_check`

Every module must expose a manifest object from `manifest.py`.

### Step 4 - Add Boundary And Layer Lints

Port the current architecture rules using Python AST.

Boundary rule:

- `app.modules.<module_a>` cannot import `app.modules.<module_b>` unless allowlisted.

Layer rules:

- `routes.py` may import `schemas`, `services`, `dependencies`, shared HTTP errors.
- `routes.py` may not import repositories/adapters/domain directly.
- `services.py` may import repositories/adapters/domain/schemas.
- `repositories.py` may not import routes/services.
- `domain.py` may not import FastAPI, repositories, services, routes, adapters.
- `schemas.py` may not import services/repositories/adapters/routes.
- `adapters.py` may not import routes/services.

Add native tests:

```text
tests/contracts/test_module_boundaries.py
tests/contracts/test_module_layers.py
```

### Step 5 - Add API Docs/OpenAPI Contract

Use FastAPI generated OpenAPI as source of truth.

Add:

```text
scripts/check_api_docs.py
tests/contracts/test_openapi_registry.py
docs/API.md
docs/hades/API.md
```

Required Hades/Hermes routes:

```text
POST /api/hades/hermes/sessions
POST /api/hades/hermes/{profile_name}/media
GET /api/hades/hermes/{profile_name}/media/{attachment_id}
POST /api/hades/hermes/speak
POST /api/hades/hermes/transcribe
POST /api/hades/hermes/{profile_name}/v1/responses
```

Important:

- OpenAPI operation ids must be stable.
- Docs registry must match OpenAPI.
- Routes must have tags.
- Response models must be explicit.

### Step 6 - Port Auth First

Implement `auth` module before Hermes.

Required behavior:

- Verify Supabase JWT server-side.
- Return `{ user_id, tenant_id }`.
- Missing/invalid auth raises 401/403.
- No anonymous shared production identity.
- Tests must prove no route creates `anonymous_anonymous`.

FastAPI seam:

```python
async def get_current_identity(...) -> Identity:
    ...
```

Routes use:

```python
identity: Identity = Depends(get_current_identity)
```

### Step 7 - Port Hermes Session Bootstrap

Implement `POST /api/hades/hermes/sessions`.

Required behavior:

- Auth required.
- Ensures per-user Hermes profile.
- Starts/verifies profile gateway.
- Returns browser-safe edge route.
- Does not return `API_SERVER_KEY`.
- Does not return raw Hermes headers.
- Does not return provider keys.

Expected response shape:

```json
{
  "profileName": "tenant_user",
  "hermesApiBaseUrl": "/api/hades/hermes/tenant_user/v1",
  "authMode": "edge_injected",
  "routingToken": "..."
}
```

### Step 8 - Port Hermes Profile Provisioning

Implement:

```text
app/modules/hermes/profile_registry.py
app/modules/hermes/profile_provisioner.py
app/modules/hermes/profile_session_broker.py
app/modules/hermes/gateway_process_manager.py
app/modules/hermes/edge_auth_proxy.py
```

Required behavior:

- New profile seeds from canonical Hades soul.
- Existing `SOUL.md` is preserved.
- Existing `config.yaml` is preserved unless intentionally migrated.
- Existing `state.db` is preserved.
- Never create empty `state.db`.
- Do not copy server-level `TELEGRAM_BOT_TOKEN` into profile unless the user owns that token.
- Store only hash/metadata for `API_SERVER_KEY`; raw key stays server-side.
- Gateway health checks support dependency injection for tests.

### Step 9 - Port Edge Proxy

Implement the Hades-to-Hermes proxy route.

Required behavior:

- Browser calls FastAPI Hades.
- FastAPI verifies user access to profile.
- FastAPI strips browser `Authorization`, `Origin`, `Referer`, and browser `sec-*` headers before upstream Hermes call.
- FastAPI injects profile `API_SERVER_KEY` server-side.
- Upstream target remains loopback/internal.
- If Hermes profile API is unavailable, return 503; do not fake success.

### Step 10 - Port Media/STT/TTS

Implement:

```text
POST /api/hades/hermes/{profile_name}/media
GET /api/hades/hermes/{profile_name}/media/{attachment_id}
POST /api/hades/hermes/speak
POST /api/hades/hermes/transcribe
```

Rules:

- Media route verifies profile ownership.
- Upload validates MIME/extension.
- Path traversal forbidden.
- Images can become Hermes `input_image` parts.
- Audio can be transcribed before Hermes call.
- Video/PDF/text docs become stored attachments with extracted/derived text when possible.
- TTS uses an injectable process runner for `edge-tts`.
- STT uses injectable HTTP client/env for Groq Whisper.
- Do not expose `GROQ_API_KEY` to browser.

### Step 11 - Modal Workers

After the API/profile core is green, add Modal.

Modal should own bursty jobs:

- OCR.
- vision preprocessing.
- video frame extraction.
- audio conversion.
- document extraction.

Modal should not be the first owner of long-lived Hermes profile state.

### Step 12 - Daytona Workspaces

After the API/profile core is green, add Daytona.

Daytona should own:

- user/project workspaces.
- code execution environments.
- future minion workspaces.

Hermes profile state must remain explicitly durable and single-owner.

Do not confuse:

- Hermes profile state
- workspace filesystem
- model/tool execution sandbox

They may point at each other, but they are not the same thing.

## Red-To-Green Checklist

Run from the current monorepo:

```bash
HADES_FASTAPI_REPO=<new-repo-path> npm run test:fastapi-migration-red
```

Work until this passes.

Then run from the new repo:

```bash
python -m pytest
python scripts/check_module_boundaries.py
python scripts/check_module_layers.py
python scripts/check_api_docs.py
```

Then run the E2E suite from the current monorepo:

```bash
HADES_FASTAPI_BASE_URL=http://127.0.0.1:8000 \
HADES_FASTAPI_E2E_AUTH_TOKEN=<test-token> \
npm run test:fastapi-migration-e2e
```

## What Not To Do

- Do not port feature code before module contracts are red.
- Do not make one giant `main.py`.
- Do not put DB calls in route handlers.
- Do not put HTTP provider calls in route handlers.
- Do not bypass dependency injection with global clients in routes.
- Do not expose `API_SERVER_KEY` or provider keys in Pydantic schemas.
- Do not create anonymous shared profiles.
- Do not call Hermes directly from the browser.
- Do not run duplicate Hermes gateway owners for the same profile.
- Do not make Modal the durable Hermes state owner in the first slice.
- Do not overwrite existing Hermes `SOUL.md`, `config.yaml`, or `state.db` on login/refresh.

## Definition Of Done

The first migration slice is done when:

- Static red suite passes against the new repo.
- Native pytest suite passes in the new repo.
- `/health` and `/openapi.json` work.
- Unauthenticated Hermes session bootstrap fails closed.
- Authenticated Hermes session bootstrap returns edge route only.
- Response schemas have no forbidden secrets.
- Module boundary/layer scripts pass.
- Docs registry matches OpenAPI.
- Existing frontend can point at the FastAPI backend without changing the browser-to-Hades contract.

## Final Recommendation

Build the new repo as a contract-compatible FastAPI control plane first.

Do not try to migrate every feature at once. The safe first vertical slice is:

```text
auth -> Hermes session bootstrap -> profile provisioner -> edge proxy -> one chat message -> media upload
```

Once that is green, Modal and Daytona can be added without destabilizing Hades/Hermes identity and profile state.
