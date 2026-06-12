# Discord Auth Bot Bridge

**Date:** 2026-06-12  
**Phase:** 007  
**Status:** implemented

This dated planning folder captures the next identity/runtime split for Hades OS:

- Discord OAuth signs the user into the app
- a separate Hermes Discord bot uses its own server token
- the backend links the verified user to the bot runtime
- the socials UI can later show a real connected state instead of preview-only placeholders

## Artifacts

- [plan-log.md](./plan-log.md)
- [audit-log.md](./audit-log.md)
- [handoff.md](./handoff.md)
- [manifest.json](./manifest.json)

## Why This Phase Exists

We already verified that:

- Supabase Discord OAuth can log the user into the app
- backend identity verification is the trust source for Hermes jobs
- Hermes and Hades are separate from the Discord transport layer

What was implemented in this phase:

- a backend bridge that verifies the Supabase session before any bot setup
- a server-side Discord bot token path that ignores client-supplied bot secrets
- a Hermes Discord bot runtime adapter that runs separately from user OAuth
- contract tests that keep the separation enforced

What remains for later follow-up:

- user login should not be mistaken for bot login
- the bot must use its own server token
- the backend must map the verified Discord identity to the bot runtime
