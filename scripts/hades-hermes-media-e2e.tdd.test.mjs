import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RUN = process.env.HADES_HERMES_MEDIA_E2E === "1";
const BASE_URL = (process.env.HADES_E2E_BASE_URL || "").replace(/\/+$/, "");
const AUTH_TOKEN = process.env.HADES_E2E_AUTH_TOKEN || "";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE_DIR = path.join(ROOT, "file-exchange", "hermes-media-fixtures");

function headers(extra = {}) {
  return {
    ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
    "x-user-id": "anonymous",
    "x-tenant-id": "anonymous",
    ...extra,
  };
}

function url(path) {
  if (/^https?:\/\//.test(path)) return path;
  return `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function readJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function readFixture(name) {
  return fs.readFileSync(path.join(FIXTURE_DIR, name));
}

function fixtureBase64(name) {
  return readFixture(name).toString("base64");
}

describe("Hades/Hermes media E2E proof", { skip: RUN ? false : "Set HADES_HERMES_MEDIA_E2E=1 to run media proof." }, () => {
  test("session bootstrap, image send, STT, TTS, PDF/video upload, and media resolver do not leak secrets", async () => {
    assert.ok(BASE_URL, "HADES_E2E_BASE_URL is required.");
    assert.ok(AUTH_TOKEN, "HADES_E2E_AUTH_TOKEN is required.");

    const imageBase64 = fixtureBase64("sample-image.png");
    const audioBase64 = process.env.HADES_E2E_AUDIO_BASE64 || fixtureBase64("sample-audio.wav");
    const pdfBytes = readFixture("sample-document.pdf");
    const videoBytes = readFixture("sample-video.avi");

    const sessionResponse = await fetch(url("/api/hades/hermes/sessions"), {
      method: "POST",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({}),
    });
    const session = await readJson(sessionResponse);

    assert.equal(sessionResponse.status, 200, `session bootstrap failed: ${JSON.stringify(session)}`);
    assert.ok(session.profileName, "session response must include profileName.");
    assert.ok(session.hermesApiBaseUrl, "session response must include hermesApiBaseUrl.");
    assert.equal(session.authMode, "edge_injected");
    assert.equal(JSON.stringify(session).includes("API_SERVER_KEY"), false);
    assert.equal(JSON.stringify(session).includes("GROQ_API_KEY"), false);
    assert.equal(JSON.stringify(session).includes("OPENROUTER_API_KEY"), false);
    assert.equal(Object.hasOwn(session, "apiServerKey"), false);

    const imageTurnResponse = await fetch(url(`${session.hermesApiBaseUrl.replace(/\/+$/, "")}/responses`), {
      method: "POST",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        model: "hermes-agent",
        conversation: "media-e2e",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: "Say only: image received." },
              {
                type: "input_image",
                image_url: `data:image/png;base64,${imageBase64}`
              }
            ]
          }
        ],
        store: true,
      }),
    });
    const imageTurn = await readJson(imageTurnResponse);
    assert.notEqual(imageTurnResponse.status, 400, `inline image must not be rejected: ${JSON.stringify(imageTurn)}`);
    assert.equal(JSON.stringify(imageTurn).includes("unsupported_content_type"), false);

    const transcriptResponse = await fetch(url("/api/hades/hermes/transcribe"), {
      method: "POST",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ audio: audioBase64, filename: "sample-audio.wav" }),
    });
    const transcript = await readJson(transcriptResponse);
    assert.equal(transcriptResponse.status, 200, `transcribe failed: ${JSON.stringify(transcript)}`);
    assert.ok(transcript.text && transcript.text.trim(), "transcription must return text.");

    const speechResponse = await fetch(url("/api/hades/hermes/speak"), {
      method: "POST",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ text: "Media proof complete." }),
    });
    assert.equal(speechResponse.status, 200, `speak failed with status ${speechResponse.status}`);
    assert.match(speechResponse.headers.get("content-type") || "", /audio\/mpeg/);
    assert.ok((await speechResponse.arrayBuffer()).byteLength > 0, "TTS must return audio bytes.");

    const form = new FormData();
    form.append("purpose", "document");
    form.append(
      "file",
      new File([pdfBytes], "sample-document.pdf", { type: "application/pdf" })
    );

    const uploadResponse = await fetch(url(`/api/hades/hermes/${session.profileName}/media`), {
      method: "POST",
      headers: headers(),
      body: form,
    });
    const upload = await readJson(uploadResponse);
    assert.equal(uploadResponse.status, 201, `PDF upload failed: ${JSON.stringify(upload)}`);
    assert.equal(upload.attachment?.contentType, "application/pdf");
    assert.ok(upload.attachment?.url, "upload must return a browser-safe Hades media URL.");
    assert.ok(upload.attachment?.promptPart, "upload must return an agent prompt fragment.");
    assert.equal(JSON.stringify(upload).includes("API_SERVER_KEY"), false);
    assert.equal(JSON.stringify(upload).includes("GROQ_API_KEY"), false);
    assert.equal(JSON.stringify(upload).includes("OPENROUTER_API_KEY"), false);

    const downloadResponse = await fetch(url(upload.attachment.url), { headers: headers() });
    assert.equal(downloadResponse.status, 200, `media resolver failed with status ${downloadResponse.status}`);
    assert.match(downloadResponse.headers.get("content-type") || "", /application\/pdf|octet-stream/);

    const videoForm = new FormData();
    videoForm.append("purpose", "video");
    videoForm.append(
      "file",
      new File([videoBytes], "sample-video.avi", { type: "video/x-msvideo" })
    );

    const videoUploadResponse = await fetch(url(`/api/hades/hermes/${session.profileName}/media`), {
      method: "POST",
      headers: headers(),
      body: videoForm,
    });
    const videoUpload = await readJson(videoUploadResponse);
    assert.equal(videoUploadResponse.status, 201, `video upload failed: ${JSON.stringify(videoUpload)}`);
    assert.match(videoUpload.attachment?.contentType || "", /video\//);
    assert.ok(videoUpload.attachment?.url, "video upload must return a browser-safe Hades media URL.");
    assert.ok(videoUpload.attachment?.promptPart, "video upload must return an agent prompt fragment.");
  });
});
