# Planning Session: Social Provider Pipeline + Full-Stack Integration

**Date:** June 13, 2026

## Context

Full end-to-end flow for Discord and Telegram integration through Hermes minion runtime. All providers feed through the same pipeline:

```
Webhook → POST /api/hades/triggers → handleTrigger → minionAssignmentRuntime → Hermes → execute → send reply
```

## Full User Flow

### Step 1 — Login
- Email/password, Discord OAuth, Google, Apple, iCloud
- Session tied to `user_id`, stored in Supabase Auth
- **Status:** Done (auth routes, login UI, Supabase session bridge)

### Step 2 — Main App (Post-Login)
- Land on `/app/minions`
- Three tabs: [MINIONS] [FORGE] [SOCIALS]
- Hades chat is always visible, context-aware (`forge` vs `minions`)
- **Status:** Done (post-login shell, nav, context-aware chat)

### Step 3 — Connect Social Accounts
- SOCIALS tab → Discord card / Telegram card
- **Discord:** OAuth popup → user selects server → store in `discord_connections`
- **Telegram:** Telegram Login widget → BotFather instructions → user pastes token → encrypt → store in `telegram_connections`
- **Status:** Social cards UI exists, `telegramClient.js`, `discordClient.js`, `botTokenProvider.js` exist. Missing: connection table schemas, encryption, OAuth handlers, setup instructions UI.

### Step 4 — Forge Minions
- FORGE tab → chat with Hades → draft built → test/edit → save
- POST /api/hades/minions
- **Status:** Forge UI, draft editor, test/save buttons, Hermes draft building all done. Missing: persist minions to Supabase.

### Step 5 — Assign Minions
- MINIONS tab → select minion → detail panel → assign to social + command name
- POST /api/hades/assignments
- **Status:** Minions list, detail, assignment UI, service/repository methods done. Missing: persist to Supabase.

### Step 6 — Runtime Triggers
- User types `!catgif` in Discord or `/catgif` in Telegram
- Webhook → POST /api/hades/triggers
- Pipeline:
  1. `verifySocialAccount(provider, accountId)` → queries connections table
  2. `findActiveAssignment(...)` → finds assigned minion
  3. `hermesRuntime.executeMinion(...)` → Hermes decision
  4. `socialClient.sendMessage(...)` → Discord: uses bot token from env / Telegram: decrypts user's token
- **Status:** Route exists, `minionAssignmentRuntime` service exists, `handleTrigger` exists. Missing: real `verifySocialAccount`, real `socialClient`, real `hermesRuntime` wired, webhook signature verification.

### Step 7 — Chat History
- All interactions stored in `agent_executions`, `conversations`, `messages` tables
- User can clear from Forge or Minions screen (button + hourly auto-clear)
- **Status:** Clear button done, `clearMessages` service/repo done. Missing: persist all to Supabase.

## Architecture Decisions

| Aspect | Decision |
|--------|----------|
| **Discord bot token** | One app-level `DISCORD_BOT_TOKEN` in `.env`. All replies use the same Hades Bot. |
| **Telegram bot tokens** | Per-user, stored encrypted in `telegram_connections` table. Each user creates their own bot via BotFather. |
| **SQL tables needed** | `telegram_connections`, `discord_connections`, `agent_executions` (plus existing in-memory: `conversations`, `messages`, `minions`, `assignments`) |
| **User-facing naming** | "Hades" = product, "Minions" = agents, Hermes kept internal |
| **All providers** | Feed through same `POST /api/hades/triggers` → `minionAssignmentRuntime` pipeline |

## 5 Features for TDD Implementation (~27 RED tests)

| # | Feature | Tests | What it covers |
|---|---------|-------|----------------|
| 1 | Supabase SQL migrations | 8 | Migration files exist, correct schema for all 7 tables |
| 2 | Discord production wiring | 6 | `DISCORD_BOT_TOKEN` config, `discordBotRuntime` wired, `verifySocialAccount`, `socialClient`, module wiring |
| 3 | Telegram bot runtime | 7 | `telegramBotRuntime.service.js`, Telegram `verifySocialAccount`, `socialClient`, token encryption, module wiring |
| 4 | Hourly auto-clear | 3 | Button, timer, cleanup on unmount |
| 5 | Minion edit/test UI | 4 | Edit button, test button, preview output |

## Env Vars Status

| Var | Status |
|-----|--------|
| `SUPABASE_URL` | Set in `.env` |
| `SUPABASE_SERVICE_ROLE_KEY` | Set in `.env` |
| `DISCORD_BOT_TOKEN` | Needs to be added (create Hades Bot in Discord Dev Portal) |
| `TELEGRAM_BOT_TOKEN` | Per-user, stored in Supabase (no env var needed) |
| `OPENROUTER_API_KEY` | Set in `.env` |

## Blockers / Changes Needed

- [ ] Create Discord Bot application → get `DISCORD_BOT_TOKEN`
- [ ] Decide on encryption strategy for Telegram tokens
- [ ] OAuth handler stubs for Discord/Telegram connect flow
- [ ] Confirm `social_connections` vs `discord_connections`/`telegram_connections` table naming
- [ ] Discord Interaction signature verification scope (ed25519)
