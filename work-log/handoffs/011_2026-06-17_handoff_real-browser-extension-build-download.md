# Handoff: Real Browser Extension Build And Download

**Date:** 2026-06-17
**Depends on:** `work-log/handoffs/010_2026-06-17_handoff_hades-extension-install-and-design.md`
**Primary TDD gates:**

```bash
npm run test:hades-extension-real-build
npm run test:hades-extension-install
npm --prefix extension run build
npm --prefix extension run package
```

## Objective

Turn the current extension shell into a real buildable browser extension and make the Socials UI download button download an actual zip archive.

The source of visual truth is:

```text
file-exchange/imports/hades_extension_only_react_prototype.html
```

That ChatGPT prototype is extension-only. It intentionally excludes the Socials UI install card.

## Current Problem

- `extension/package.json` exists, but dependencies may not be installed locally.
- `extension/public/manifest.json` points to `popup.html`.
- `extension/popup.html` does not exist yet.
- `extension/src/popup.jsx` does not exist yet.
- `HadesExtensionApp` is still a placeholder heading.
- Prototype CSS has not been ported into extension CSS.
- No package script creates `extension/dist/extension.zip`.
- Backend `downloadExtensionBundle()` expects `extension/dist/extension.zip`, so the download route cannot truly work until the artifact exists.

## OpenCode Build Contract

Make these pass without weakening tests:

```bash
npm run test:hades-extension-real-build
npm run test:hades-extension-install
```

Then verify:

```bash
npm --prefix extension install
npm --prefix extension run build
npm --prefix extension run package
```

Expected implementation:

- Add `extension/popup.html` matching `manifest.action.default_popup`.
- Add `extension/src/popup.jsx`.
- Add `extension/src/hades-extension.css` ported from the ChatGPT prototype.
- Replace placeholder `HadesExtensionApp` with a real React shell.
- Add or implement `ExtensionConnectPanel`.
- Wire/import these surfaces in `HadesExtensionApp`:
  - `HadesChatPanel`
  - `WorkflowListPanel`
  - `ContextUploadPanel`
  - `TextContextSpacesPanel`
  - `PageCapturePanel`
  - `ApprovalQueuePanel`
  - `ExtensionConnectPanel`
- Preserve safety copy: Hades can draft/fill, but submit/send/destructive actions require approval.
- Add `extension/package.json` script `package`.
- Add `scripts/package-hades-extension.mjs`.
- Ensure package script creates `extension/dist/extension.zip`.
- Ensure the zip is a real archive beginning with `PK`.
- Ensure backend `GET /api/hades/extension/download` returns that real zip.

## API And Runtime Notes

The real extension UI should use:

- `Authorization: Bearer <extension-key>`
- `GET /api/hades/extension/workflows`
- `POST /api/hades/extension/chat`
- `POST /api/hades/extension/documents`
- `GET /api/hades/extension/text-context-spaces`
- `POST /api/hades/extension/text-context-spaces`
- `POST /api/hades/extension/page-context`
- `GET /api/hades/extension/approvals`
- `POST /api/hades/extension/approvals/:id/decision`

Runtime auth must resolve the connected user from the extension key. Do not trust user IDs from query/body.

## Download Contract

Backend route:

```http
GET /api/hades/extension/download
```

Response:

```http
200 OK
content-type: application/zip
content-disposition: attachment; filename="hades-extension-<user>.zip"
```

Body:

- Real zip bytes from `extension/dist/extension.zip`.
- First two bytes must be `PK`.

## Done Definition

- `npm run test:hades-extension-real-build` passes.
- `npm run test:hades-extension-install` passes.
- `npm --prefix extension run build` passes.
- `npm --prefix extension run package` creates `extension/dist/extension.zip`.
- Socials UI download button downloads the real zip through the backend route.
- Extension UI visibly reflects `file-exchange/imports/hades_extension_only_react_prototype.html`.

## Current Red Result

`npm run test:hades-extension-real-build`:

- 1 pass: ChatGPT extension-only prototype exists and is recognized as the design source.
- 4 fail: missing `extension/popup.html`, missing `extension/src/popup.jsx`, `HadesExtensionApp` is still a placeholder, missing `extension/src/hades-extension.css`, missing `package` script, missing `scripts/package-hades-extension.mjs`, and missing `extension/dist/extension.zip`.

`npm run test:hades-extension-install`:

- Backend install route mock tests pass.
- Backend real service download test fails because `extension/dist/extension.zip` is not available.
- Extension runtime auth tests pass.
- Socials UI install/key-management tests pass.
- Real extension build test fails for the same popup/CSS/package/zip gaps.
