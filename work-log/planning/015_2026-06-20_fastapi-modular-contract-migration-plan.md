# Plan Log 015 - FastAPI Modular Contract Migration

Date: 2026-06-20

Status: planning candidate with red tests written

Related:

- `docs/hades/DAYTONA_MODAL_FASTAPI_MIGRATION_STUDY.md`
- `work-log/planning/014_2026-06-20_daytona-modal-fastapi-migration-plan.md`
- `scripts/hades-fastapi-modular-contract.red.test.mjs`
- `scripts/hades-fastapi-migration-e2e.tdd.test.mjs`
- `work-log/handoffs/024_2026-06-20_handoff_opencode_fastapi_modular_contract_migration.md`
- `docs/hermes-agent/user-guide/profiles.md`
- `docs/hermes-agent/user-guide/features/api-server.md`
- `docs/hermes-agent/user-guide/docker.md`
- `docs/hermes-agent/user-guide/sessions.md`

## Short Answer

Yes, the same modular contracts can be applied to FastAPI.

The mapping is clean:

| Current Express contract | FastAPI equivalent |
|---|---|
| `src/modules/<module>/index.js` | `app/modules/<module>/manifest.py` |
| Express router files | FastAPI `APIRouter` |
| Route factories with injected services | `Depends(...)` dependency providers |
| JS service factories | Python service classes/functions constructed by dependency providers |
| JS repositories/adapters | Python `repositories.py` / `adapters.py` layers |
| JSON request validation | Pydantic request models |
| JSON response shaping | Pydantic response models |
| `lint:boundaries` | Python AST import-boundary lint |
| `lint:layers` | Python AST layer lint |
| `lint:api-docs` | OpenAPI + docs registry contract |
| `invokeApp` route tests | `TestClient` / `httpx.AsyncClient` tests |
| Hades edge proxy | FastAPI streaming/proxy route with server-side secret injection |

FastAPI actually gives us one advantage over Express: OpenAPI is generated from the app, so we can use it as a first-class contract source instead of reconstructing route surfaces from source regexes.

## Target New Repo Shape

```text
hades-os-fastapi/
  pyproject.toml
  app/
    __init__.py
    main.py
    module_registry.py
    shared/
      __init__.py
      settings.py
      http/
        errors.py
      contracts/
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
        ...
      hermes/
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
        ...
      workers/
        ...
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
    e2e/
      test_hades_hermes_session.py
  docs/
    API.md
    architecture/
      MODULAR_CONTRACTS.md
    hades/
      API.md
```

## Non-Negotiable Architecture Rules

- Browser talks to FastAPI Hades, not directly to Hermes.
- FastAPI Hades injects Hermes `API_SERVER_KEY` server-side only.
- Browser responses never contain `API_SERVER_KEY`, `OPENROUTER_API_KEY`, `GROQ_API_KEY`, service-role secrets, raw profile `.env`, or Telegram bot tokens.
- Missing or invalid auth fails closed with 401/403.
- No anonymous shared production profile.
- Hermes profile API targets stay private loopback/internal routes.
- Each Hermes profile owns durable `SOUL.md`, `.env`, `config.yaml`, `state.db`, sessions, memories, skills, gateway state, and platform tokens.
- Existing profile `SOUL.md`, `config.yaml`, and `state.db` are never overwritten on login or refresh.
- New profiles seed from canonical Hades soul.
- One active owner process writes to a given Hermes profile at a time.
- Modal is for bursty workers, not the first home for long-lived Hermes state.
- Daytona is for persistent workspaces/dev/runtime surfaces, not an excuse to duplicate gateway processes.

## Red Tests Added In This Repo

### Static repo contract

Command:

```bash
HADES_FASTAPI_REPO=../hades-os-fastapi npm run test:fastapi-migration-red
```

File:

```text
scripts/hades-fastapi-modular-contract.red.test.mjs
```

Purpose:

- Fails until the new FastAPI repo exists.
- Checks the repo skeleton.
- Checks required modules.
- Checks module manifests.
- Checks route thinness.
- Checks boundary/layer/API-doc lint scripts.
- Checks Hermes profile runtime files.
- Checks docs route registry.
- Checks response schemas do not expose forbidden secrets.

Expected current red result:

```text
FAIL: Missing FastAPI migration repo
```

### Running API E2E contract

Command:

```bash
HADES_FASTAPI_BASE_URL=http://127.0.0.1:8000 \
HADES_FASTAPI_E2E_AUTH_TOKEN=<test-token> \
npm run test:fastapi-migration-e2e
```

File:

```text
scripts/hades-fastapi-migration-e2e.tdd.test.mjs
```

Purpose:

- Skips until `HADES_FASTAPI_BASE_URL` is set.
- Checks `/health`.
- Checks `/openapi.json`.
- Checks OpenAPI includes Hades/Hermes routes.
- Checks unauthenticated Hermes session bootstrap fails closed.
- Checks authenticated session bootstrap returns edge route only and no secrets.
- Checks image upload returns a retrievable media route.

## Migration Phases

### Phase 0 - Create New Repo

Goal:

Create `hades-os-fastapi` with a minimal Python toolchain.

Required:

- `pyproject.toml`
- FastAPI
- Uvicorn
- Pydantic v2
- pydantic-settings
- pytest
- httpx
- ruff
- mypy or pyright optional after first green

Done when:

- `python -m pytest` runs.
- `app.main:create_app()` exists.
- `/health` works.

### Phase 1 - Port Modular Contract Skeleton

Goal:

Recreate the repo/module contract before porting features.

Implement:

- `ModuleManifest`
- `module_registry.py`
- `app/main.py` app factory
- one `APIRouter` per module
- docs registry placeholder
- AST lints for module boundaries/layers

Done when:

- `npm run test:fastapi-migration-red` reaches module-specific failures instead of missing repo skeleton failures.

### Phase 2 - Port Auth And Hades Session Core

Goal:

Move the authenticated Hades control plane first.

Implement:

- Supabase JWT verification.
- tenant/user identity extraction.
- fail-closed auth dependency.
- no anonymous shared profile.
- `POST /api/hades/hermes/sessions` route.

Done when:

- unauth session E2E returns 401/403.
- authenticated session returns profile edge route only.

### Phase 3 - Port Hermes Profile Runtime

Goal:

Preserve current Hades/Hermes profile behavior.

Implement:

- profile registry
- profile provisioner
- profile session broker
- gateway process manager
- edge auth proxy
- secret-safe profile route metadata

Done when:

- new profiles seed from Hades soul.
- existing `SOUL.md`, `config.yaml`, `state.db` are preserved.
- no raw API server key serializes to the browser.
- gateway health/start behavior is testable through dependency injection.

### Phase 4 - Port Media, STT, TTS

Goal:

Make frontend media/chat work through FastAPI.

Implement:

- media upload route
- media resolver route
- `/speak`
- `/transcribe`
- Groq Whisper config
- edge-tts process seam
- object storage seam

Done when:

- image/PDF/audio/video fixture tests pass.
- browser still sends Hermes inputs using named `conversation` and `previous_response_id`.

### Phase 5 - Modal Workers

Goal:

Move bursty workloads to Modal without moving durable Hermes profile ownership there.

Implement workers for:

- OCR
- image analysis
- video frame extraction/summarization
- audio conversion/transcription if cheaper than managed STT
- document extraction

Done when:

- job router can submit work.
- job results are stored in object storage.
- FastAPI can poll/resolve job results.

### Phase 6 - Daytona Workspaces

Goal:

Add persistent workspaces without confusing workspace state with Hermes profile state.

Implement:

- workspace registry
- workspace lifecycle API
- user/project workspace mapping
- tool cwd mapping for Hermes profiles

Done when:

- Hades can create/attach/suspend a workspace.
- Hermes `terminal.cwd` can point to the intended workspace.
- no profile gateway is duplicated.

### Phase 7 - Strangler Cutover

Goal:

Move traffic safely.

Sequence:

1. Keep current Express/Railway production stable.
2. Bring up FastAPI staging.
3. Run static contract tests against the new repo.
4. Run E2E tests against FastAPI staging.
5. Point a dev frontend at FastAPI.
6. Migrate one auth user/profile.
7. Migrate media.
8. Migrate Telegram/native gateways.
9. Cut production only after rollback is clear.

## Sources Checked

- FastAPI bigger applications and `APIRouter`: https://fastapi.tiangolo.com/tutorial/bigger-applications/
- FastAPI dependencies: https://fastapi.tiangolo.com/tutorial/dependencies/
- FastAPI testing: https://fastapi.tiangolo.com/tutorial/testing/
- FastAPI OpenAPI/docs metadata: https://fastapi.tiangolo.com/tutorial/metadata/
- Local Hermes profiles docs: `docs/hermes-agent/user-guide/profiles.md`
- Local Hermes API server docs: `docs/hermes-agent/user-guide/features/api-server.md`
- Local Hermes Docker docs: `docs/hermes-agent/user-guide/docker.md`
- Local Hermes sessions docs: `docs/hermes-agent/user-guide/sessions.md`

## Recommendation

Make OpenCode create the new repo and immediately run:

```bash
HADES_FASTAPI_REPO=<new-repo-path> npm run test:fastapi-migration-red
```

Do not port feature code first. Port the contracts first, then go red-to-green module by module.
