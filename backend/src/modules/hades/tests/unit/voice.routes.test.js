import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createHermesSessionRoutes } from "../../routes/hermes.routes.js";
import { invokeApp } from "../../../../shared/testing/invoke-app.js";

function createApp(overrides = {}) {
  const voiceService = {
    synthesizeSpeech: async () => Buffer.from([0x00, 0x01, 0x02, 0x03]),
    transcribeAudio: async () => "Hello world",
    ...overrides,
  };

  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use("/api/hades/hermes", createHermesSessionRoutes({ voiceService }));
  return app;
}

test("POST /api/hades/hermes/speak returns audio/mpeg with TTS audio", async () => {
  const app = createApp();
  const response = await invokeApp(app, {
    method: "POST",
    path: "/api/hades/hermes/speak",
    body: { text: "Hello world", voice: "en-US-JennyNeural" },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers["content-type"], "audio/mpeg");
  assert.ok(response.body.length > 0);
});

test("POST /api/hades/hermes/speak returns 400 when text is missing", async () => {
  const app = createApp();
  const response = await invokeApp(app, {
    method: "POST",
    path: "/api/hades/hermes/speak",
    body: { voice: "en-US-JennyNeural" },
  });
  assert.equal(response.status, 400);
  assert.equal(JSON.parse(response.body).error, "text is required");
});

test("POST /api/hades/hermes/speak returns 503 when voiceService is not configured", async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/hades/hermes", createHermesSessionRoutes({}));
  const response = await invokeApp(app, {
    method: "POST",
    path: "/api/hades/hermes/speak",
    body: { text: "Hello" },
  });
  assert.equal(response.status, 503);
  assert.ok(JSON.parse(response.body).error);
});

test("POST /api/hades/hermes/transcribe returns text transcript", async () => {
  const app = createApp();
  const response = await invokeApp(app, {
    method: "POST",
    path: "/api/hades/hermes/transcribe",
    body: { audio: Buffer.from("fake-audio-data").toString("base64"), filename: "test.wav" },
  });
  assert.equal(response.status, 200);
  assert.equal(JSON.parse(response.body).text, "Hello world");
});

test("POST /api/hades/hermes/transcribe returns 503 when voiceService is not configured", async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/hades/hermes", createHermesSessionRoutes({}));
  const response = await invokeApp(app, {
    method: "POST",
    path: "/api/hades/hermes/transcribe",
    body: { audio: Buffer.from("data").toString("base64") },
  });
  assert.equal(response.status, 503);
  assert.ok(JSON.parse(response.body).error);
});

test("POST /api/hades/hermes/transcribe returns 400 when audio field is missing", async () => {
  const app = createApp();
  const response = await invokeApp(app, {
    method: "POST",
    path: "/api/hades/hermes/transcribe",
    body: {},
  });
  assert.equal(response.status, 400);
});
