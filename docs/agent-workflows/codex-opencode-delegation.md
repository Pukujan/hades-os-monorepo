# Codex And OpenCode Delegation Workflow

This workflow turns the research in `work-log/study-docs/008 deep-research-report.md` into the default way we handle risky Hades OS integration work.

The goal is to stop hallucinated glue code. We split the work so one agent proves the shape of the problem before another agent edits implementation code.

## Ownership

Codex owns planning.

- Extract the User Context Packet before reading code.
- Build the Evidence Log from repo files, local docs, schemas, migrations, tests, and installed dependency signatures.
- Write Red Tests or a minimal reproduction before implementation.
- Produce the Planning Handoff for OpenCode.
- Stop instead of guessing when secrets, auth ownership, schema behavior, or dependency signatures are unclear.

OpenCode owns implementation.

- Read `AGENTS.md`, `CODE_IMPLEMENTATION.md`, and the Planning Handoff.
- Run the Red Tests before editing code.
- Implement the smallest diff that satisfies the tests.
- Run local verification and report every command.
- Run Hosted Verification for `auth`, `proxy`, `oauth`, or `cross-service` phases, or state exactly why it could not be run.
- Produce the Completion Handoff.

## Runtime Boundary

OpenCode is a development executor, not the production chat/task runtime.

Production user flow stays:

```txt
User -> Frontend -> Hades -> Hermes -> Hermes tools/connectors/models
```

Development workflow stays:

```txt
User -> Codex planning/red tests -> OpenCode implementation/verification
```

## Hades And Hermes Rule

Hades should remain a thin proxy around auth, profile resolution, key custody, and route translation.

Do not reimplement Hermes sessions in Hades or the frontend. Hermes owns conversation chaining, profile memory, tools, sessions, `SOUL.md`, and runtime state. If Hades code manually rebuilds transcript history, mirrors Hermes sessions, or runs task execution routes that Hermes already owns, treat that as legacy glue until proven otherwise.

## Required Gates

Use this gate order for integration fixes:

1. User Context Packet
2. Evidence Log
3. Command discovery from repo files
4. Dependency signature confirmation
5. Red Tests or reproduction
6. Small implementation by OpenCode
7. Local tests/typecheck/lint
8. Hosted Verification when the phase crosses deployed boundaries
9. Reimplementation check
10. Completion Handoff

## High-Risk Boundaries

These areas need extra suspicion and proof:

- Browser to Hades Supabase JWT and CORS
- Hades to Hermes profile routing, `API_SERVER_KEY`, and network host assumptions
- Hermes-native conversation/session delegation
- OAuth redirect URI and webhook handling
- Env parity across Vercel, Railway, Supabase, and Hermes
- Media, voice, OCR, image, video, and file upload routing

## Stop Conditions

Stop and hand back to the user when:

- The repo docs conflict with implementation and there is no test/schema evidence to resolve it.
- Runtime secrets are missing.
- Supabase RLS or ownership behavior is unclear.
- Hermes docs have not been read for Hermes changes.
- The fix requires replacing product architecture rather than making a small safe change.
- Hosted Verification is required but cannot be run from the current environment.
