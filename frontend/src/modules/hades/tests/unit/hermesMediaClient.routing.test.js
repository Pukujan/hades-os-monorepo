import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAILWAY_API_BASE = "https://hades-os-monorepo-production.up.railway.app";
const VERCEL_ORIGIN = "https://hades-os-monorepo.vercel.app";
const DIR = dirname(fileURLToPath(import.meta.url));

let fetchCalls;
let originalFetch;
let originalFileReader;

function mockEnv({ mode = "production", apiBaseUrl = RAILWAY_API_BASE } = {}) {
  globalThis.importMetaEnvShim = { MODE: mode, VITE_API_BASE_URL: apiBaseUrl };
}

async function loadClient() {
  return import("../../services/hermesMediaClient.js");
}

beforeEach(() => {
  fetchCalls = [];
  originalFetch = globalThis.fetch;
  originalFileReader = globalThis.FileReader;
  mockEnv();

  globalThis.fetch = async (url, options = {}) => {
    fetchCalls.push({ url, options });
    if (String(url).endsWith("/speak")) {
      return new Response("audio", {
        status: 200,
        headers: { "Content-Type": "audio/mpeg" },
      });
    }
    return new Response(JSON.stringify({
      ok: true,
      profileName: "tenant_user",
      hermesApiBaseUrl: "/api/hades/hermes/tenant_user/v1",
      attachment: { id: "att_1", url: "/api/hades/hermes/tenant_user/media/att_1" },
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  globalThis.FileReader = class MockFileReader {
    readAsDataURL() {
      this.result = "data:audio/wav;base64,UklGRg==";
      this.onload?.();
    }
  };
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.FileReader = originalFileReader;
  delete globalThis.importMetaEnvShim;
});

test("startHermesSession uses VITE_API_BASE_URL in production instead of Vercel same-origin /api", async () => {
  const { startHermesSession } = await loadClient();

  await startHermesSession("test-access-token");

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, `${RAILWAY_API_BASE}/api/hades/hermes/sessions`);
  assert.notEqual(fetchCalls[0].url, "/api/hades/hermes/sessions");
  assert.notEqual(fetchCalls[0].url, `${VERCEL_ORIGIN}/api/hades/hermes/sessions`);
});

test("uploadHermesMedia uses VITE_API_BASE_URL for profile media uploads", async () => {
  const { uploadHermesMedia } = await loadClient();

  await uploadHermesMedia({
    profileName: "tenant_user",
    file: new Blob(["pdf"], { type: "application/pdf" }),
  }, "test-access-token");

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, `${RAILWAY_API_BASE}/api/hades/hermes/tenant_user/media`);
});

test("transcribeHermesAudio uses VITE_API_BASE_URL for Groq STT bridge", async () => {
  const { transcribeHermesAudio } = await loadClient();

  await transcribeHermesAudio({
    audioBlob: new Blob(["wav"], { type: "audio/wav" }),
    filename: "sample-audio.wav",
  }, "test-access-token");

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, `${RAILWAY_API_BASE}/api/hades/hermes/transcribe`);
});

test("synthesizeHermesSpeech uses VITE_API_BASE_URL for Edge TTS bridge", async () => {
  const { synthesizeHermesSpeech } = await loadClient();

  await synthesizeHermesSpeech({ text: "hello" }, "test-access-token");

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, `${RAILWAY_API_BASE}/api/hades/hermes/speak`);
});

test("sendHermesResponse normalizes relative profile edge routes to the Railway backend origin", async () => {
  const { sendHermesResponse } = await loadClient();

  await sendHermesResponse({
    hermesApiBaseUrl: "/api/hades/hermes/tenant_user/v1",
    input: "hello",
  }, "test-access-token");

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, `${RAILWAY_API_BASE}/api/hades/hermes/tenant_user/v1/responses`);
});

test("sendHermesResponse leaves absolute backend profile edge routes untouched", async () => {
  const { sendHermesResponse } = await loadClient();
  const absoluteRoute = `${RAILWAY_API_BASE}/api/hades/hermes/tenant_user/v1`;

  await sendHermesResponse({
    hermesApiBaseUrl: absoluteRoute,
    input: "hello",
  }, "test-access-token");

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, `${absoluteRoute}/responses`);
});

test("sendHermesResponse never sends both named conversation and previous_response_id", async () => {
  const { sendHermesResponse } = await loadClient();

  await sendHermesResponse({
    hermesApiBaseUrl: "/api/hades/hermes/tenant_user/v1",
    input: "who are you",
    conversation: "hades-web-minions-user-1",
    previousResponseId: "resp_previous",
  }, "test-access-token");

  assert.equal(fetchCalls.length, 1);
  const body = JSON.parse(fetchCalls[0].options.body);
  assert.equal(body.conversation, "hades-web-minions-user-1");
  assert.equal(Object.hasOwn(body, "previous_response_id"), false);
});
test("hermesMediaClient source must route through shared apiUrl instead of hardcoded same-origin API base", () => {
  const source = readFileSync(resolve(DIR, "../../services/hermesMediaClient.js"), "utf8");

  assert.match(source, /apiUrl/, "Hermes media client must import/use the shared apiUrl helper.");
  assert.doesNotMatch(
    source,
    /const\s+HADES_API_BASE\s*=\s*["']\/api\/hades\/hermes["']/,
    "Hermes media client must not hardcode same-origin /api/hades/hermes in production.",
  );
});
