# Handoff: Discord Auth Bot Bridge

## Summary

Implement the next Hades runtime slice with TDD:

- Discord OAuth logs the user into the app
- a separate Hermes Discord bot uses a server-side bot token
- the backend links the verified Discord identity to the bot runtime
- the socials UI can reflect a real connected state later

## Canonical Handoff

The canonical implementation brief also lives at:

- `work-log/handoffs/006_2026-06-12_15-30_handoff_discord-auth-bot-bridge.md`

## TDD Gates

1. `npm run test:auth-discord-connection-contract`
2. `npm run test:hades-discord-bot-runtime-contract`
3. `npm run test:discord-login-bot-contracts`

## Required Behavior

- Discord app login stays powered by Supabase OAuth.
- The Hermes bot must use a separate server-side Discord token.
- Backend verification is the only trusted bridge between user identity and bot runtime.
- Client-supplied bot tokens, Discord access tokens, and identity overrides are ignored.
- The socials UI should not claim the Discord bot is connected unless the backend confirms it.

## Stop Conditions

- destructive actions
- missing live credentials that cannot be mocked
- external secret mutation
- repeated blockers that cannot be resolved locally
