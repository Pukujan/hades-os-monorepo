# Plan Log 013 - Hades/Hermes Media Frontend

Date: 2026-06-19

Status: ready for OpenCode implementation

Related:

- `docs/hades/HERMES_MEDIA_FRONTEND_INTEGRATION.md`
- `work-log/study-docs/006_2026-06-19_study-log_hermes-media-voice-file-intake.md`
- `work-log/handoffs/022_2026-06-19_handoff_opencode_hades-hermes-media-frontend.md`
- `scripts/hades-hermes-media-contract.tdd.test.mjs`
- `scripts/hades-hermes-media-e2e.tdd.test.mjs`

## Objective

Replace the frontend's text-only Hades chat path with a Hermes profile API flow that supports speech, images, video, PDFs, documents, and assistant media output.

## Constraints

- TDD first.
- Hades owns auth, profile route bootstrap, server-side secret injection, uploads, and media URL resolution.
- Hermes owns agent reasoning, tool use, profile state, memory, image/video/TTS/STT configuration, and generated artifacts.
- Browser must never receive `API_SERVER_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, service-role keys, or raw profile `.env`.
- Do not assume Hermes API server accepts file uploads.
- Keep Hades media upload/resolve paths directly under Hermes routes, not legacy Hades chat.
- Do not silently fall back to legacy `/api/hades/chat/general`; Hermes chat must either use Hermes or show an explicit unavailable/error state.

## Red Tests

Run:

```bash
npm run test:hades-hermes-media-red
```

Expected now:

- Passes when profile media config, Hades media upload/resolver routes, frontend Hermes media client, media composer, multi-attachment rendering, and no-legacy-fallback contracts are satisfied.
- Fails if `HadesPrototypeApp.jsx` imports or calls `sendGeneralChat` from the Hermes chat send path.
- Fails if Hermes errors are hidden behind local draft fallback behavior.

Run:

```bash
npm run test:hades-hermes-media-e2e
```

Expected now:

- Skips unless `HADES_HERMES_MEDIA_E2E=1`.
- Fails when enabled until a running app supports the full media flow.

## Phase 1 - Backend Profile Config And Gateway Launch

Implement in `backend/src/modules/hades/runtime/hermesProfileProvisioner.js`.

Acceptance:

- Profile `.env` includes API server settings.
- Profile `.env` includes `GROQ_API_KEY` only when available server-side.
- Profile `.env` includes `STT_GROQ_MODEL=whisper-large-v3-turbo`.
- Profile `config.yaml` includes `stt.provider: groq`.
- Profile `config.yaml` includes `tts.provider: edge`.
- Profile `config.yaml` includes `auxiliary.vision.provider: openrouter`.
- Profile `config.yaml` includes `auxiliary.vision.model: qwen/qwen3-vl-8b-instruct`.
- Profile config enables required media toolsets or documents how Hermes defaults cover them.

Tests:

- Unit test provisioner output with fake env.
- Assert no raw keys in route/session responses.

Process launch acceptance:

- `createHermesProfileGatewayProcessManager` health-checks `http://127.0.0.1:<port>/health`.
- If health fails, it starts `hermes -p <profileName> gateway`.
- Session bootstrap waits for the gateway to become healthy before returning the browser edge route.
- Session bootstrap returns an error instead of a dead route if the gateway cannot become healthy.

Process launch tests:

- Unit test no spawn when health is already OK.
- Unit test spawn command and `HERMES_HOME` env when health is down.
- Unit test session broker calls the gateway manager before returning `hermesApiBaseUrl`.

## Phase 2 - Hades Media Upload Bridge

Add route under `backend/src/modules/hades/routes/hermes.routes.js`.

Target endpoint:

```text
POST /api/hades/hermes/:profileName/media
```

Request:

- `multipart/form-data`
- `file`
- optional `conversation`
- optional `purpose`

Response:

```json
{
  "attachment": {
    "id": "att_...",
    "kind": "document",
    "name": "report.pdf",
    "contentType": "application/pdf",
    "size": 12345,
    "profileName": "tenant_user",
    "agentPath": "/.../.hermes/cache/documents/report.pdf",
    "url": "/api/hades/hermes/tenant_user/media/att_...",
    "extractedText": "...",
    "promptPart": "User attached report.pdf at /...; extracted text: ..."
  }
}
```

Implementation notes:

- Use `multer` already present in backend dependencies.
- Do not write outside profile cache roots.
- Normalize filenames.
- Enforce `HERMES_MEDIA_MAX_BYTES`.
- Return `413` for oversized upload.
- Return `415` for unsupported file type.
- Extract text for safe text/PDF/DOCX types.
- Keep large extracted text bounded.
- Do not inline binary bytes.

Tests:

- Unit route test for image upload.
- Unit route test for PDF upload and extracted text.
- Unit route test for unsupported binary rejection.
- Unit route test for path traversal filename sanitation.
- Unit route test for profile ownership/auth.

## Phase 3 - Media Resolver

Add a server-side resolver for assistant media output.

Responsibilities:

- Parse `MEDIA:/path` tags from Hermes assistant output.
- Convert profile-local files to signed Hades URLs.
- Verify file path is inside allowed profile directories.
- Infer MIME type.
- Return normalized attachments.

Acceptance:

- Assistant messages can include multiple attachments.
- Browser never sees raw local paths unless in dev/debug mode.
- Downloads stream with safe `Content-Type` and `Content-Disposition`.

Tests:

- Unit test parser extracts multiple `MEDIA:` tags.
- Unit test rejects path outside profile.
- Route test streams a cached PDF/video/image.

## Phase 4 - Frontend Hermes Media Client

Add:

```text
frontend/src/modules/hades/services/hermesMediaClient.js
```

Exports:

- `startHermesSession`
- `sendHermesResponse`
- `uploadHermesMedia`
- `transcribeHermesAudio`
- `synthesizeHermesSpeech`
- `buildHermesInputFromComposer`

Acceptance:

- Session bootstrap calls `/api/hades/hermes/sessions`.
- Text/image chat calls the returned `hermesApiBaseUrl`.
- Small image files become `input_image` parts.
- PDF/video/non-image files upload first and become prompt text/path parts.
- Auth uses Supabase access token only.
- No provider keys enter frontend code.
- No fallback call to `/api/hades/chat/general`.
- Hermes send/session failures surface as explicit unavailable/error UI.

Tests:

- Unit tests for request paths.
- Unit tests for image content conversion.
- Unit tests for upload and prompt fragment conversion.
- Unit tests for preserving `previousResponseId` and `conversation`.

## Phase 5 - Frontend Composer

Add media composer UI to Hades chat.

Features:

- Attach button.
- Drag/drop.
- Paste image support.
- Attachment chips.
- Remove attachment.
- Upload progress/error state.
- Microphone record button.
- Transcript preview.
- Send transcript plus attachments in one Hermes turn.

Tests:

- Component test renders attach/mic buttons.
- Component test displays image/PDF/video chips.
- Component test calls transcribe after recording stop.
- Component test sends Hermes response with text plus attachments.

## Phase 6 - Frontend Rendering

Update `ChatBubble`.

Acceptance:

- Supports `message.attachments[]`.
- Images render inline.
- Video renders with controls.
- Audio renders with controls.
- PDFs/files render as open/download cards.
- Legacy `mediaUrl` still works.

Tests:

- Existing GIF/media tests still pass.
- New attachment array tests pass.

## Phase 7 - E2E

Add proof against a running app.

Permanent fixture files:

```text
file-exchange/hermes-media-fixtures/sample-image.png
file-exchange/hermes-media-fixtures/sample-audio.wav
file-exchange/hermes-media-fixtures/sample-video.avi
file-exchange/hermes-media-fixtures/sample-document.pdf
```

These fixtures are kept for future E2E runs. Do not delete them during cleanup.

Required env:

```text
HADES_HERMES_MEDIA_E2E=1
HADES_E2E_BASE_URL=http://127.0.0.1:3001
HADES_E2E_AUTH_TOKEN=<test user jwt>
HADES_E2E_AUDIO_BASE64=<optional override; defaults to sample-audio.wav>
```

Proofs:

- Session bootstrap returns profile edge route only.
- Session bootstrap waits for a healthy profile API server.
- Image content reaches Hermes API through edge route.
- Audio transcribes through Hades STT.
- Assistant text can synthesize through Hades TTS.
- PDF upload returns profile-local attachment metadata.
- Video upload returns profile-local attachment metadata.
- Uploaded attachment URL resolves through Hades media resolver.
- Browser response never contains raw secrets.

## Done Criteria

- `npm run test:hades-hermes-media-red` passes.
- `HADES_HERMES_MEDIA_E2E=1 npm run test:hades-hermes-media-e2e` passes in local proof env.
- Existing voice service and route tests still pass.
- Existing frontend media rendering tests still pass.
- `npm run lint:architecture` passes except explicitly documented pre-existing API doc issues, if still present.
- Docs updated with final endpoint shapes.
