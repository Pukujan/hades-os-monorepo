# Handoff: Hades Extension Install And Design

**Date:** 2026-06-17
**Depends on:** `work-log/handoffs/009_2026-06-17_16-51_handoff_hermes-workflow-orchestrator.md`
**Follow-up build handoff:** `work-log/handoffs/011_2026-06-17_handoff_real-browser-extension-build-download.md`
**Primary TDD gate:** `npm run test:hades-extension-install`

## Objective

Build a first-class Hades browser extension install module inside the app. The app should let the user generate a rotatable extension API key, copy the one-time secret, view/revoke/rotate existing keys, and download the extension bundle from the Socials UI.

Scope split:

- OpenCode owns the in-app Socials UI install card, extension API key generation/copy/rotate/revoke UX, and extension bundle download UX.
- ChatGPT owns only the browser extension design: popup, side panel, chat, workflow list/detail, uploads, text spaces, page capture, approvals, and the API key paste/connect screen inside the extension.
- ChatGPT must not design the Socials UI install card.

## OpenCode Build Contract

OpenCode should build this module TDD-first and make these commands pass:

```bash
npm run test:hades-extension-install
npm --prefix backend run test:hades-extension-install
npm --prefix frontend run test:hades-extension-install-ui
node --test scripts/hades-extension-design-handoff.contract.test.mjs
```

Expected implementation:

- Add backend `GET /api/hades/extension/download`.
- Add a service method such as `downloadExtensionBundle(authContext)`.
- Return a zip attachment with `content-type: application/zip`.
- Keep extension key routes auth-scoped.
- Add frontend module folder `frontend/src/modules/hades/extension`.
- Add `frontend/src/modules/hades/extension/services/extensionInstallApi.js`.
- Add `frontend/src/modules/hades/extension/utils/extensionInstallViewModel.js`.
- Add `ExtensionInstallCard` and render it in Socials UI.
- Socials UI card must expose Generate new API key, Copy API key, Rotate, Revoke, and Download extension actions.
- Never show stored raw extension secrets after creation.
- Store extension API keys as non-reversible server-side hashes, not decryptable plaintext. The plaintext key is returned only once on create/rotate.
- Extension runtime APIs must derive `userId`, `tenantId`, and scopes from the presented extension API key. They must ignore caller-supplied user/tenant values.
- Download button must request `GET /api/hades/extension/download`.

## OpenCode Socials UI Contract

OpenCode should build the in-app Socials UI install card using existing app visual language unless a later app-specific design replaces it.

Required Socials UI behaviors:

- Render `ExtensionInstallCard` inside Socials UI.
- Show extension status and short install explanation.
- Show Generate new API key.
- Show Copy API key only for the latest one-time secret.
- Show existing keys with redacted previews only.
- Show Rotate and Revoke actions for active keys.
- Show Download extension button.
- Download button must use `GET /api/hades/extension/download`.
- The Socials UI card is not part of the ChatGPT design scope.
- The Socials UI card must not imply the app can recover old API keys. It can only generate/rotate to produce a new one-time secret.

## API Contracts

### `GET /api/hades/extension/download`

Purpose: download the extension source/build bundle as a zip.

Auth: app user auth token.

Response:

```http
200 OK
content-type: application/zip
content-disposition: attachment; filename="hades-extension-<user-or-version>.zip"
```

Body: zip bytes.

Failure:

```json
{ "code": "extension_bundle_unavailable", "message": "Extension bundle is not available." }
```

### `GET /api/hades/extension/keys`

Purpose: list extension API keys for the current authenticated user.

Response:

```json
{
  "keys": [
    {
      "id": "key_123",
      "name": "Chrome extension",
      "scopes": ["workflow:read", "document:upload", "approval:create"],
      "secretPreview": "hades_ext_...abcd",
      "createdAt": "2026-06-17T00:00:00.000Z",
      "rotatedAt": null,
      "revokedAt": null
    }
  ]
}
```

Raw `secret` must not appear in this response.

Storage rule: the backend stores a one-way hash of the key, not the raw key and not a decryptable encrypted copy.

### `POST /api/hades/extension/keys`

Purpose: generate a new extension API key.

Request:

```json
{
  "name": "Chrome extension",
  "scopes": ["workflow:read", "document:upload", "approval:create"]
}
```

Response:

```json
{
  "record": {
    "id": "key_123",
    "name": "Chrome extension",
    "scopes": ["workflow:read", "document:upload", "approval:create"],
    "secretPreview": "hades_ext_...abcd",
    "createdAt": "2026-06-17T00:00:00.000Z",
    "rotatedAt": null,
    "revokedAt": null
  },
  "secret": "hades_ext_live_secret_once"
}
```

The `secret` is shown once and should be copied by the user into the extension.

### `POST /api/hades/extension/keys/:id/rotate`

Purpose: rotate an existing extension API key.

Response shape matches create response and includes a new one-time `secret`.

### `POST /api/hades/extension/keys/:id/revoke`

Purpose: revoke an extension API key.

Response:

```json
{
  "record": {
    "id": "key_123",
    "revokedAt": "2026-06-17T00:00:00.000Z"
  }
}
```

### Extension Runtime APIs

These are needed by the extension design and later runtime work:

- `GET /api/hades/extension/workflows`: list workflows/minions available in the extension.
- `POST /api/hades/extension/chat`: send Hades chat messages from extension popup/side panel.
- `POST /api/hades/extension/documents`: upload PDFs/files from the extension into the shared context store.
- `GET /api/hades/extension/text-context-spaces`: list text context spaces.
- `POST /api/hades/extension/text-context-spaces`: create/update text context spaces.
- `POST /api/hades/extension/page-context`: save current URL/title/selected text/page text/form map.
- `GET /api/hades/extension/approvals`: list pending approval prompts.
- `POST /api/hades/extension/approvals/:id/decision`: approve/reject a proposed action.

Extension runtime API auth: extension API key via `Authorization: Bearer <extension-key>`.

Runtime auth rule:

- Missing, unknown, revoked, or wrong-scope extension keys return `401`.
- Valid extension keys create an extension auth context from the key record: `{ userId, tenantId, scopes, keyId }`.
- Extension runtime APIs must never trust `userId` or `tenantId` from query/body.
- App-auth routes such as `/api/hades/extension/keys` remain limited to the logged-in app user.

## Data Contracts

### Extension Install Panel State

```json
{
  "providerId": "hades-browser-extension",
  "title": "Hades Browser Extension",
  "status": "ready",
  "primaryActions": {
    "generateKey": { "label": "Generate new API key" },
    "copySecret": { "label": "Copy API key", "enabled": true },
    "downloadExtension": {
      "label": "Download extension",
      "href": "/api/hades/extension/download"
    }
  },
  "latestCreatedSecret": {
    "value": "hades_ext_live_secret_once",
    "visibleOnce": true
  },
  "keys": [
    {
      "id": "key_123",
      "name": "Chrome extension",
      "secretPreview": "hades_ext_...abcd",
      "secretVisible": false,
      "scopes": ["workflow:read", "document:upload"],
      "canRotate": true,
      "canRevoke": true,
      "revokedAt": null
    }
  ]
}
```

### Extension Workflow Row

```json
{
  "id": "workflow_123",
  "title": "Apply to targeted job",
  "description": "Tailors resume, drafts cover letter, fills form after approval.",
  "status": "active",
  "lastRunStatus": "approval_required",
  "nextAction": "Review form fill proposal"
}
```

### Page Context

```json
{
  "url": "https://jobs.example.test/apply",
  "title": "Apply - Senior Frontend Engineer",
  "selectedText": "React, accessibility, Playwright",
  "visibleText": "Job description...",
  "forms": [
    {
      "selector": "form#apply",
      "fields": [
        {
          "name": "email",
          "label": "Email",
          "type": "email",
          "hasSensitiveValue": true
        }
      ],
      "submitSelector": "button[type=submit]"
    }
  ]
}
```

## ChatGPT Extension-Only Design Contract

ChatGPT should design only the browser extension experience from these contracts. It should not design the in-app Socials UI install card. It should not invent new backend endpoints unless clearly marked as a proposal.

Deliverables expected from ChatGPT:

- Figma-style output with layout, spacing, typography, colors, states, and interaction notes.
- React component map for extension surfaces only.
- Copy deck for labels, helper text, warnings, empty states, and success/error toasts.
- Mobile extension side panel layout.
- Popup layout.
- Data mapping table showing which UI element reads which API/data contract field.
- Safety/approval UX notes for form fill and submit actions.

## Screens To Design

- Extension popup.
- Mobile extension side panel.
- Extension API key paste/connect screen.
- Extension Hades chat.
- Workflow/minion list.
- Workflow detail with Markdown and Mermaid explanation.
- Upload PDFs/files panel.
- Text context spaces list/editor.
- Page capture preview.
- Approval queue.
 
Not in ChatGPT design scope:

- Socials UI install card.
- Main app API key generation screen.
- Main app extension download card.

## States To Design

- No extension key yet.
- Key generated and secret visible once.
- Secret copied.
- Key list with redacted previews.
- Key revoked.
- Key rotated.
- Extension bundle available.
- Extension bundle unavailable.
- Chat loading/error/success.
- File upload progress/error/success.
- Page context captured.
- Approval required.
- Approved.
- Rejected.

## Design Tone

The extension should feel like a compact command cockpit, not a generic settings panel. It should be calm, trustworthy, and action-focused. It should make the safety boundary obvious: Hades can draft and fill, but submitting or sending needs the user's approval.

## Done Definition

- `npm run test:hades-extension-install` passes.
- Socials UI has a clear browser extension install card.
- User can generate a key, copy the one-time secret, rotate/revoke listed keys, and download the extension bundle.
- ChatGPT extension-only design handoff remains updated if API/data contracts change.

## Current TDD Result

`npm run test:hades-extension-install` passes all three contract layers.

Backend:

- 2/2 pass: `GET /api/hades/extension/download` returns zip attachment; `POST /api/hades/extension/keys` returns one-time secret and listed keys stay redacted.

Frontend:

- 3/3 pass: extension install API client exposes key lifecycle and download endpoints; install view model shows all actions; Socials UI imports and renders `ExtensionInstallCard` with `data-provider="hades-browser-extension"`.

Repo handoff contract:

- 1/1 pass: handoff includes all required sections (OpenCode Build Contract, OpenCode Socials UI Contract, ChatGPT Extension-Only Design Contract, API Contracts, Data Contracts, Screens To Design, States To Design).
