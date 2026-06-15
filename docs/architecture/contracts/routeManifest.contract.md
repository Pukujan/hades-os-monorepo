# Contract: Route Manifest

**Version:** v001

## Purpose

Standardize how API routes are registered, named, and documented across all backend modules.

## Scope

HTTP route definitions in `backend/src/modules/*/routes/` directories. Middleware, hooks, and non-HTTP event handlers are out of scope.

## Rules

1. Every route file must export a function that accepts a router (Express or Fastify-compatible).
2. Route paths must use the module name as a prefix (e.g., `/auth/login`, `/hades/query`).
3. Route files must be named after the resource they expose (kebab-case).
4. Each route must have a corresponding entry in `docs/API.md`.
5. Route methods must be explicitly declared (GET, POST, PUT, DELETE, PATCH).
6. Route handlers must not contain business logic — delegate to service/controller layers.

## Required artifacts

- Route files under `backend/src/modules/*/routes/`
- `docs/API.md` — route registry documentation

## Enforcement

Automated: `lint:api-docs` validates `docs/API.md` entries. `lint:boundaries` validates cross-module import rules.

Manual: reviewers must verify module prefixes match the module name.

## Non-goals

- Versioning individual routes
- OpenAPI/Swagger generation
- Frontend route conventions
