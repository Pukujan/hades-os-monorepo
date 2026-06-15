# ADR-0008: API Documentation Standards

## Status

Accepted

## Context

Phase 9 requires documentation standards for backend API endpoints. Without standards, API documentation is inconsistent and difficult to maintain.

## Decision

Every route in the backend must have a corresponding `API.md` file documenting the endpoint, method, request/response format, and error codes. API docs are registered in an endpoint registry (`metadata/api-endpoints.json`). The `lint:api-docs` check enforces that every route handler has a corresponding `API.md` file.

## Consequences

- Easier: consistent API documentation, automated coverage enforcement.
- More difficult: adding a new endpoint requires both a route handler and an `API.md` file.
- API docs are validated as part of the `lint:repo-architecture` chain.

## Links

- [ADR-0005](./0005-architecture-enforcement-lints.md)
- [ADR-0006](./0006-doc-canonicalization.md)
