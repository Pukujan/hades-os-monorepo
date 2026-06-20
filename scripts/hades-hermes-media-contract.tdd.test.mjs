import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

function assertFile(relPath, message) {
  assert.ok(fs.existsSync(path.join(ROOT, relPath)), message || `Expected ${relPath} to exist`);
}

function assertSourceMatches(source, pattern, message) {
  assert.ok(pattern.test(source), message);
}

describe("Hades/Hermes media profile contract", () => {
  test("profile provisioning writes media-aware Hermes env and config", () => {
    const source = read("backend/src/modules/hades/runtime/hermesProfileProvisioner.js");

    assertSourceMatches(source, /GROQ_API_KEY/, "Profile .env must receive GROQ_API_KEY from server env for Hermes STT.");
    assertSourceMatches(source, /STT_GROQ_MODEL=whisper-large-v3-turbo/, "Profile .env must pin cheap Groq Whisper Turbo.");
    assertSourceMatches(source, /stt:\s*[\s\S]*provider:\s*["']?groq["']?/, "Profile config.yaml must set stt.provider: groq.");
    assertSourceMatches(source, /tts:\s*[\s\S]*provider:\s*["']?edge["']?/, "Profile config.yaml must set tts.provider: edge.");
    assertSourceMatches(source, /auxiliary:\s*[\s\S]*vision:\s*[\s\S]*provider:\s*["']?openrouter["']?/, "Profile config.yaml must route auxiliary vision through OpenRouter.");
    assertSourceMatches(source, /qwen\/qwen3-vl-8b-instruct/, "Profile config.yaml must use cheap Qwen3 VL 8B for OCR/vision.");
    assertSourceMatches(source, /toolsets:\s*[\s\S]*(vision|image_gen|video_gen)/, "Profile config must document or enable media toolsets.");
  });
});

describe("Hades/Hermes media upload contract", () => {
  test("Hermes routes expose authenticated profile media upload and resolver surfaces", () => {
    const source = read("backend/src/modules/hades/routes/hermes.routes.js");

    assertSourceMatches(source, /\/:profileName\/media/, "Expected POST /:profileName/media upload route under Hermes routes.");
    assertSourceMatches(source, /multipart|multer|form-data/i, "Upload route must accept multipart/form-data, preferably through multer.");
    assertSourceMatches(source, /HERMES_MEDIA_MAX_BYTES|MAX_UPLOAD|fileSize/i, "Upload route must enforce an upload size cap.");
    assertSourceMatches(source, /application\/pdf|\.pdf|pdf-parse/i, "Upload route must explicitly support PDF intake.");
    assertSourceMatches(source, /video\/mp4|\.mp4|video/i, "Upload route must explicitly support video intake.");
    assertSourceMatches(source, /image\/png|image\/jpeg|input_image|image/i, "Upload route must explicitly support image intake.");
    assertSourceMatches(source, /path traversal|startsWith|profileRoot|hermesHome/i, "Upload/resolver must guard against cross-profile path access.");
  });

  test("backend exposes a media resolver for assistant MEDIA tags", () => {
    const source = read("backend/src/modules/hades/routes/hermes.routes.js");

    assertSourceMatches(source, /MEDIA:/, "Backend must parse or normalize Hermes MEDIA:/path outputs.");
    assertSourceMatches(source, /attachments/, "Backend must return normalized assistant attachments.");
    assertSourceMatches(source, /Content-Disposition|download|stream/i, "Backend must stream or download resolved profile media.");
  });
});

describe("Frontend Hermes media client contract", () => {
  test("frontend has a dedicated Hermes media client instead of only legacy text chat helpers", () => {
    assertFile(
      "frontend/src/modules/hades/services/hermesMediaClient.js",
      "Expected frontend/src/modules/hades/services/hermesMediaClient.js with session, response, upload, STT, and TTS helpers."
    );

    const source = read("frontend/src/modules/hades/services/hermesMediaClient.js");
    assertSourceMatches(source, /startHermesSession/, "Client must start a Hermes profile session.");
    assertSourceMatches(source, /sendHermesResponse/, "Client must send turns to Hermes /v1/responses.");
    assertSourceMatches(source, /uploadHermesMedia/, "Client must upload PDF/video/non-image files through Hades.");
    assertSourceMatches(source, /transcribeHermesAudio/, "Client must call Hades /transcribe for browser audio.");
    assertSourceMatches(source, /synthesizeHermesSpeech/, "Client must call Hades /speak for assistant playback.");
    assertSourceMatches(source, /input_image|image_url/, "Client must build native Hermes inline image content.");
  });

  test("Hades chat app is wired to Hermes session/media flow", () => {
    const source = read("frontend/src/modules/hades/pages/HadesPrototypeApp.jsx");

    assertSourceMatches(source, /startHermesSession/, "Chat app must start a Hermes session.");
    assertSourceMatches(source, /sendHermesResponse/, "Chat app must send via Hermes /v1/responses.");
    assertSourceMatches(source, /uploadHermesMedia/, "Chat app must upload attachments before sending.");
    assertSourceMatches(source, /transcribeHermesAudio/, "Chat app must support microphone transcription.");
    assertSourceMatches(source, /synthesizeHermesSpeech/, "Chat app must support assistant speech playback.");
    assertSourceMatches(source, /previousResponseId|conversation/, "Chat app must keep Hermes conversation continuity.");
  });

  test("Hades chat app does not silently fall back to legacy Hades chat", () => {
    const appSource = read("frontend/src/modules/hades/pages/HadesPrototypeApp.jsx");
    const clientSource = read("frontend/src/modules/hades/services/hermesMediaClient.js");

    assert.doesNotMatch(appSource, /sendGeneralChat/, "Hermes frontend path must not call legacy /api/hades/chat/general.");
    assert.doesNotMatch(appSource, /buildLocalDraftFallback|Using local fallback|local fallback/i, "Hermes failures must be visible unavailable states, not local draft fallbacks.");
    assert.doesNotMatch(clientSource, /\/api\/hades\/chat\/general|sendGeneralChat/, "Hermes media client must not route to legacy Hades chat.");
  });

  test("frontend has a media composer for speech, images, video, and documents", () => {
    assertFile(
      "frontend/src/modules/hades/components/HermesMediaComposer.jsx",
      "Expected HermesMediaComposer with attach, paste/drop, microphone, and attachment chip UI."
    );

    const source = read("frontend/src/modules/hades/components/HermesMediaComposer.jsx");
    assertSourceMatches(source, /type=["']file["']|DataTransfer|drop|paste/i, "Composer must support file picker/drop/paste.");
    assertSourceMatches(source, /MediaRecorder|getUserMedia|microphone|record/i, "Composer must support browser audio recording.");
    assertSourceMatches(source, /image|video|pdf|document|attachment/i, "Composer must represent image/video/PDF/document attachments.");
  });

  test("ChatBubble renders structured attachment arrays while preserving legacy mediaUrl support", () => {
    const source = read("frontend/src/modules/hades/components/ChatBubble.js");

    assertSourceMatches(source, /attachments/, "ChatBubble must render message.attachments[].");
    assertSourceMatches(source, /chat-attachment|attachment-list|attachment-card/, "ChatBubble must expose attachment-specific markup/classes.");
    assertSourceMatches(source, /video\/|<video|React\.createElement\(["']video["']/, "ChatBubble must render video attachments with controls.");
    assertSourceMatches(source, /audio\/|<audio|React\.createElement\(["']audio["']/, "ChatBubble must render audio attachments with controls.");
    assertSourceMatches(source, /application\/pdf|Download file|Open file|chat-download/, "ChatBubble must render PDF/file attachments as open/download cards.");
    assertSourceMatches(source, /mediaUrl/, "Legacy mediaUrl rendering must remain for existing messages.");
  });
});
