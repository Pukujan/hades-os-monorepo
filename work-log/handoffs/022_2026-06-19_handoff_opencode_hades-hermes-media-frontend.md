# Handoff #022 - OpenCode Hades/Hermes Media Frontend

Date: 2026-06-19

Audience: OpenCode implementation agent

## Mission

Implement the Hades/Hermes media frontend integration so the web chat supports:

- Hermes profile API text chat.
- Browser speech-to-text.
- Assistant text-to-speech playback.
- Image paste/upload into Hermes.
- PDF/document upload.
- Video upload.
- File download/render from assistant outputs.

This is a TDD implementation task. Do not skip the red tests.

## Read First

Read these before changing code:

```text
AGENTS.md
MEMORY.md
docs/hades/HERMES_MEDIA_FRONTEND_INTEGRATION.md
work-log/study-docs/006_2026-06-19_study-log_hermes-media-voice-file-intake.md
work-log/planning/013_2026-06-19_hades-hermes-media-frontend-plan.md
docs/hermes-agent/user-guide/features/api-server.md
docs/hermes-agent/user-guide/features/vision.md
docs/hermes-agent/user-guide/features/voice-mode.md
docs/hermes-agent/user-guide/sessions.md
docs/hermes-agent/user-guide/messaging/telegram.md
docs/hermes-agent/user-guide/messaging/discord.md
docs/hermes-agent/reference/toolsets-reference.md
```

Hermes docs are authoritative. Do not infer media support from generic OpenAI API assumptions.

## Current Red Tests

Run:

```bash
npm run test:hades-hermes-media-red
```

Expected current result:

```text
PASS if the media/no-fallback contracts are already implemented
```

Run:

```bash
npm run test:hades-hermes-media-e2e
```

Expected current result:

```text
SKIP unless HADES_HERMES_MEDIA_E2E=1
FAIL when enabled against the current app
```

Do not weaken the tests. Make the app satisfy them.

Permanent media fixtures:

```text
file-exchange/hermes-media-fixtures/sample-image.png
file-exchange/hermes-media-fixtures/sample-audio.wav
file-exchange/hermes-media-fixtures/sample-video.avi
file-exchange/hermes-media-fixtures/sample-document.pdf
```

These are future E2E fixtures, not disposable samples. Do not delete them as cleanup. If they need to be replaced, regenerate intentionally with:

```bash
npm run generate:hades-media-fixtures
```

## Architecture Rules

- Hades is auth, profile bootstrap, edge proxy, media upload/cache, media URL resolver, and server-side secret injector.
- Hades must also start or verify the per-profile Hermes gateway before returning a browser edge route.
- Hermes is the agent runtime, profile state, toolset runner, vision/image/video/TTS/STT configured capability owner.
- Browser receives only Supabase auth and Hades/Hermes edge routes.
- Browser never receives `API_SERVER_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, service-role keys, bot tokens, or profile `.env`.
- Do not push PDFs/video/files directly into Hermes `/v1/responses`; Hermes API server rejects non-image file inputs today.
- Images may be sent directly to Hermes as `input_image` data URLs or remote URLs.
- Audio from browser should be transcribed first, then sent as text.
- Do not silently fall back to legacy `/api/hades/chat/general`. If Hermes is down, show a Hermes-unavailable state and fix the profile gateway/process issue.

## Backend Implementation Checklist

1. Profile config

- Update `hermesProfileProvisioner.js`.
- Add `GROQ_API_KEY` to profile `.env` only from server env.
- Add `STT_GROQ_MODEL=whisper-large-v3-turbo`.
- Add `stt.provider: groq`.
- Add `tts.provider: edge`.
- Add `auxiliary.vision.provider: openrouter`.
- Add `auxiliary.vision.model: qwen/qwen3-vl-8b-instruct`.
- Add or document toolsets for `vision`, `image_gen`, `video_gen`, and optional `video`.

2. Profile gateway launch

- Ensure `backend/src/modules/hades/runtime/hermesProfileGatewayProcessManager.js` exists.
- Health-check `http://127.0.0.1:<profile-port>/health`.
- Start `hermes -p <profileName> gateway` when health fails.
- Use `HERMES_HOME` for the shared Hermes home that contains `profiles/<profileName>`.
- Wait for health before `POST /api/hades/hermes/sessions` returns `hermesApiBaseUrl`.
- Return an explicit error when the gateway cannot become healthy.
- If Hermes health requires auth, pass the server-only profile `API_SERVER_KEY` as bearer auth; never serialize it to browser responses.

3. Upload route

- Add `POST /api/hades/hermes/:profileName/media`.
- Use `multer`.
- Authenticate user and verify profile ownership.
- Enforce max size.
- Allow images, audio, video, PDF, text, JSON, markdown, CSV, DOCX, XLSX, PPTX, ZIP, common archives.
- Reject unsupported types.
- Store in profile cache directories.
- Extract bounded text for text/PDF/DOCX where possible.
- Return attachment metadata plus a `promptPart`.

4. Resolver

- Parse assistant `MEDIA:` tags.
- Convert profile-local paths to Hades URLs.
- Stream/download files through Hades.
- Prevent path traversal and cross-profile file access.

5. Edge proxy

- Preserve content type and SSE behavior.
- Do not JSON stringify multipart or stream bodies.
- Preserve existing `/speak` and `/transcribe`.
- Inject `API_SERVER_KEY` only server-side.
- Return `503`, not fake `200`, when upstream profile API is unavailable.

## Frontend Implementation Checklist

1. Add `frontend/src/modules/hades/services/hermesMediaClient.js`.

Required exports:

- `startHermesSession`
- `sendHermesResponse`
- `uploadHermesMedia`
- `transcribeHermesAudio`
- `synthesizeHermesSpeech`
- `buildHermesInputFromComposer`

2. Update `HadesPrototypeApp.jsx`.

- Start Hermes session after auth/bootstrap.
- Prefer `/v1/responses` through `hermesApiBaseUrl`.
- Keep `conversation` or `previousResponseId`.
- Never use legacy chat as a temporary fallback.
- Show explicit Hermes-unavailable/error UI if session bootstrap, gateway launch, upload, transcription, or response send fails.
- Add attachment state.
- Add microphone state.
- Add upload/transcription/send orchestration.

3. Add media composer.

Suggested file:

```text
frontend/src/modules/hades/components/HermesMediaComposer.jsx
```

Features:

- Attach button.
- Drag/drop.
- Paste image.
- Attachment chips.
- Mic record button.
- Transcript preview.
- Send button disabled while upload/transcription is pending.

4. Update `ChatBubble.js`.

- Render `message.attachments[]`.
- Image inline.
- Video controls.
- Audio controls.
- PDF/file download card.
- Keep existing `mediaUrl` and GIF behavior.

## E2E Proof

When implementation is ready, run:

```bash
$env:HADES_HERMES_MEDIA_E2E="1"
$env:HADES_E2E_BASE_URL="http://127.0.0.1:3001"
$env:HADES_E2E_AUTH_TOKEN="<test-user-jwt>"
npm run test:hades-hermes-media-e2e
```

`HADES_E2E_AUDIO_BASE64` is optional now; the script defaults to `file-exchange/hermes-media-fixtures/sample-audio.wav`.

The E2E must prove:

- Session bootstrap returns an edge route and no secrets.
- Inline image message reaches Hermes without `unsupported_content_type`.
- Audio transcribes through Groq/Hades.
- TTS returns playable `audio/mpeg`.
- PDF upload returns an attachment with safe metadata.
- Video upload returns an attachment with safe metadata.
- Uploaded file can be downloaded through Hades.
- No response leaks provider keys or profile API keys.

## Known Existing Issues

- Some docs currently mention `/api/hades/speak` while the actual route is `/api/hades/hermes/speak`.
- The profile API server process launch must be verified in the target runtime, even if unit tests pass.
- Existing peer-model TDD includes stale assertions about the `/api/hades/hermes` mount; do not blindly trust old comments without comparing current architecture.
- `backend/src/core/app.js` JSON limit is lower than some route tests use; large base64 audio should not rely on JSON long term.

## Suggested Implementation Order

1. Make backend profile config and profile gateway launch tests pass.
2. Add media upload route and resolver tests.
3. Add frontend client functions.
4. Add composer UI.
5. Add ChatBubble attachment rendering.
6. Wire app state to Hermes `/v1/responses` with no legacy fallback.
7. Run scoped contract suite until green.
8. Run voice route/service tests.
9. Run frontend media tests.
10. Run E2E proof with env enabled.

## Completion Report Required

Report:

- Files changed.
- Commands run.
- Tests/checks run.
- Which red tests are now green.
- Any E2E env gaps.
- Remaining risks.
