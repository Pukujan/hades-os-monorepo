# Study Log 006 - Hermes Media, Voice, and File Intake

Date: 2026-06-19

Related docs:

- `docs/hades/HERMES_MEDIA_FRONTEND_INTEGRATION.md`
- `work-log/planning/013_2026-06-19_hades-hermes-media-frontend-plan.md`
- `work-log/handoffs/022_2026-06-19_handoff_opencode_hades-hermes-media-frontend.md`

## Question

How should Hades wire the web frontend to Hermes for speech, images, video, and file upload without incorrectly assuming that the Hermes API server accepts every media type directly?

## Local Hermes Docs Read

- `docs/hermes-agent/user-guide/features/api-server.md`
- `docs/hermes-agent/user-guide/features/vision.md`
- `docs/hermes-agent/user-guide/features/voice-mode.md`
- `docs/hermes-agent/user-guide/features/image-generation.md`
- `docs/hermes-agent/developer-guide/video-gen-provider-plugin.md`
- `docs/hermes-agent/user-guide/sessions.md`
- `docs/hermes-agent/user-guide/messaging/telegram.md`
- `docs/hermes-agent/user-guide/messaging/discord.md`
- `docs/hermes-agent/reference/toolsets-reference.md`
- `docs/hermes/AGENT_CONTEXT.md`
- `docs/hermes/hermes-discovery.md`
- `docs/hermes/hermes-discovery.json`

## Findings

Hermes API server supports:

- Text chat through `/v1/chat/completions`.
- Stateful Responses API through `/v1/responses`.
- Inline image input through OpenAI-style `image_url` or `input_image` content blocks.
- Remote image URLs and `data:image/...` URLs.
- SSE progress/event streams.

Hermes API server does not support:

- General file upload.
- `input_file`.
- `file_id`.
- Non-image `data:` URLs.
- PDF upload directly through `/v1/responses`.
- Video upload directly through `/v1/responses`.

Hermes gateway adapters support richer media:

- Telegram supports text, voice, images, and file attachments.
- Discord supports text, voice messages, file attachments, images, audio, video, PDFs, text documents, JSON/XML/YAML/TOML, zip, and Office files through its adapter allowlist.
- Telegram `MEDIA:` delivery supports images, audio, video, documents, Office files, archives, books, APK, and IPA.
- Gateway adapters cache inbound media and surface paths/notes to the agent instead of repeatedly putting raw bytes into prompts.

Voice:

- Groq Whisper is supported by Hermes STT through `GROQ_API_KEY`.
- Local `faster-whisper` is also supported and needs no API key.
- OpenAI, Mistral, and xAI are alternative STT providers.
- Edge TTS is a free TTS provider and does not need an API key.

Media generation:

- `image_generate` is a Hermes tool backed by FAL/OpenAI/xAI/Nous depending on config.
- `video_generate` is a Hermes tool backed by plugins.
- Video generation is text-to-video when `image_url` is omitted and image-to-video when `image_url` is present.
- `video_analyze` exists as an opt-in toolset and is not default.

## Current App Gap

The web frontend is not yet acting like a Hermes media frontend.

It currently:

- Sends text to legacy `/api/hades/chat/general`.
- Does not start a Hermes profile session before chat.
- Does not send `/v1/responses` requests.
- Does not upload files.
- Does not send inline image content to Hermes.
- Does not use `/transcribe` or `/speak`.
- Does not render structured attachment arrays.

The backend has:

- Session bootstrap.
- Edge proxy.
- Voice STT/TTS routes.

The backend lacks:

- A media upload/cache route.
- A media resolver for assistant `MEDIA:` outputs.
- Profile config propagation for Groq STT, Edge TTS, cheap OpenRouter vision, and media toolsets.
- A confirmed profile API server startup path.

## File Intake Decision

For the web frontend:

- Images should go inline to Hermes when small enough.
- PDFs and documents should go through a Hades upload bridge.
- Video should go through a Hades upload bridge and be represented to Hermes by path and metadata.
- Audio input from the browser should be transcribed first, then sent as text.
- Large binary files should never be base64-inlined into the Hermes request.

## Supported File Policy For Hades Upload Bridge

Initial allowlist:

- Images: `png`, `jpg`, `jpeg`, `gif`, `webp`, `bmp`, `tiff`, `svg`
- Audio: `mp3`, `wav`, `ogg`, `m4a`, `opus`, `flac`, `aac`, `webm`
- Video: `mp4`, `mov`, `webm`, `mkv`, `avi`
- Documents: `pdf`, `txt`, `md`, `csv`, `json`, `xml`, `html`, `yaml`, `yml`, `log`
- Office: `docx`, `xlsx`, `pptx`, `odt`, `ods`, `odp`
- Archives: `zip`, `rar`, `7z`, `tar`, `gz`, `bz2`
- Books/packages: `epub`, `apk`, `ipa`

Implementation should enforce both extension and MIME where possible.

Unknown binaries should be rejected by default for the web product. A later trusted-local mode can mirror Discord's `allow_any_attachment`.

## Cheap Vision/OCR Decision

Use OpenRouter auxiliary vision:

```yaml
auxiliary:
  vision:
    provider: openrouter
    model: qwen/qwen3-vl-8b-instruct
```

Fallback if OCR quality is insufficient:

```yaml
auxiliary:
  vision:
    provider: openrouter
    model: qwen/qwen3-vl-32b-instruct
```

## Risks

- Hermes API server profile process is not yet fully launched by Hades.
- Upload route must not allow path traversal.
- Media resolver must not serve files outside user profile/cache roots.
- Large uploads can exhaust memory if buffered.
- PDF extraction can be slow or fail on scans.
- OCR of scanned PDFs is not automatic unless we add OCR tooling or let Hermes use a document/OCR skill.
- Video analysis requires the right Hermes toolset/provider and may be expensive.
- Assistant `MEDIA:` paths must be converted to browser-safe URLs without leaking filesystem paths.

## Recommendation

Build the web media flow in phases:

1. Use Hermes `/v1/responses` for text and inline images.
2. Use Hades `/transcribe` and `/speak` for browser speech.
3. Add Hades upload bridge for files, PDFs, and video.
4. Add media resolver for `MEDIA:` outputs.
5. Add streaming/SSE and richer tool progress once the core flow passes.

