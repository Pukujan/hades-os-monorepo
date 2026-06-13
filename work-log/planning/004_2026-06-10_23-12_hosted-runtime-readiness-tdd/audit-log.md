# Audit Log: Hosted Runtime Readiness TDD

## Context

The MVP has a working local React flow and a backend with chat, test, save, assign, and bootstrap routes. The next risk is not UI scope; it is hosted runtime confidence.

## Decisions

- Use OpenRouter as the Hermes provider for this phase.
- Keep local fallback behavior so development still works without provider keys.
- Keep Supabase service keys server-only.
- Add a readiness route that reports configuration status without exposing secrets.
- Add a smoke script so Railway/Vercel hosting can be verified after deploy.

## Risks

- A readiness route can accidentally leak env values if implemented carelessly.
- Supabase fake-client tests can pass while real Supabase table names or policies fail later.
- Hosted CORS can pass locally and fail on Vercel if `CORS_ORIGIN` is wrong.
- OpenRouter model slugs can change; keep `OPENROUTER_MODEL` configurable.

## Guardrails

- No `process.env` dump in API responses.
- No server-only env references in `frontend/`.
- Smoke script should log route names and IDs, not secrets.
- Keep Discord/Telegram integrations locked as placeholders.

## Evidence Required

```txt
backend tests pass
frontend tests pass
frontend production build passes
deploy lint passes
deploy tests pass
smoke script passes against local backend
manual browser smoke passes
```
