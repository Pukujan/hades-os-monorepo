# Session archive — 2026-06-18-slack-oauth-extension-css-rls

- **Archived:** 2026-06-18
- **Module:** `slack-oauth-extension-css-rls`
- **Previous:** workflow-orchestrator-wiring, telegram-gif-and-workflow-crud

---

## Summary

Added Slack as a new social channel (OAuth sign-in button + backend social + token storage), fixed the unstyled ExtensionInstallCard, and added RLS policies for the slack_connections table.

---

## What Shipped

### Slack OAuth UI
- `signInWithSlack()` in authClient.js using `provider: "slack_oidc"`
- Slack button with SVG icon in loginTemplate.html social grid
- `handleSlackSignIn` handler + event listener in LoginPage.jsx
- `.social.slack` CSS (purple Slack brand)

### Slack Backend Social Channel
- `"slack"` in VALID_TARGET_SOCIALS, SOCIAL_LINKS, formatSocialLabel (data.js)
- Slack provider branch in verifySocialAccount.js (checks slackConnections.findBySlackUserId)
- `saveSlackToken()` and slack in listSocialConnections in hades.service.js
- `POST /socials/slack/token` route
- `slackConnectionRepository.js` (saveToken, findPublicByUser, findBySlackUserId, findRuntimeTokenByUserId)
- Wired slackConnections in index.js, passed to verifySocialAccount

### Extension Install Card CSS
- Added 17 lines of CSS to hadesPrototype.css: extension-install-card, secret-display, key-list, key-row, key-preview, key-actions, small/danger buttons, revoked-label
- All classes were missing — component was rendering completely unstyled

### Migrations
- `010_hades_slack_connections.sql` — table with user_id, tenant_id, encrypted_token, token_last4, slack_user_id, slack_team_id, status
- `011_hades_slack_rls.sql` — ENABLE ROW LEVEL SECURITY + SELECT/INSERT/UPDATE/DELETE policies

---

## Decisions Made

- Slack connection repo follows the same pattern as gitHubConnectionRepository (encrypted token storage with crypto dependency)
- RLS policies use `auth.uid()::text = user_id OR auth.jwt()->>'sub' = user_id` to handle both UUID and text user IDs
- Backend uses service_role key (bypasses RLS), policies only affect direct PostgREST queries

---

## Test Results

| Suite | Pass | Fail | Notes |
|-------|------|------|-------|
| Backend full suite | 573 | 3 | Same 3 pre-existing failures (Instagram URL test) |
| Frontend full suite | 377 | 0 | All green |
| Extension install UI | 8 | 0 | All green |

---

## Follow-ups

- [ ] Run migrations 006→011 in Supabase SQL editor (in order)
- [ ] Toggle Leaked Password Protection ON in Auth → Settings
- [ ] Hermes 500 — blocked on Railway CLI for live logs

---

## Files Created/Changed

| File | Action |
|------|--------|
| frontend/src/auth/authClient.js | Modified |
| frontend/src/auth/loginTemplate.html | Modified |
| frontend/src/auth/LoginPage.jsx | Modified |
| frontend/src/styles/login.css | Modified |
| frontend/src/styles/hadesPrototype.css | Modified |
| backend/src/modules/hades/data.js | Modified |
| backend/src/modules/hades/runtime/verifySocialAccount.js | Modified |
| backend/src/modules/hades/services/hades.service.js | Modified |
| backend/src/modules/hades/routes/hades.routes.js | Modified |
| backend/src/modules/hades/index.js | Modified |
| backend/src/modules/hades/repositories/slackConnectionRepository.js | Created |
| backend/src/modules/hades/migrations/010_hades_slack_connections.sql | Created |
| backend/src/modules/hades/migrations/011_hades_slack_rls.sql | Created |
| additional-modules/buildplan/agent_state.json | Modified |
