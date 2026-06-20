import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";

const baseUrl = (process.env.HADES_FASTAPI_BASE_URL || "").replace(/\/+$/, "");
const authToken = process.env.HADES_FASTAPI_E2E_AUTH_TOKEN || process.env.HADES_E2E_AUTH_TOKEN || "";
const sampleImagePath = process.env.HADES_FASTAPI_SAMPLE_IMAGE || path.resolve("file-exchange/hermes-media-fixtures/sample-image.png");

function shouldSkipWithoutBaseUrl(t) {
  if (!baseUrl) {
    t.skip("Set HADES_FASTAPI_BASE_URL to run FastAPI migration E2E checks.");
    return true;
  }
  return false;
}

function shouldSkipWithoutAuth(t) {
  if (shouldSkipWithoutBaseUrl(t)) return true;
  if (!authToken) {
    t.skip("Set HADES_FASTAPI_E2E_AUTH_TOKEN or HADES_E2E_AUTH_TOKEN to run authenticated checks.");
    return true;
  }
  return false;
}

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { "content-type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { response, body, text };
}

function authHeaders() {
  return { authorization: `Bearer ${authToken}` };
}

describe("FastAPI migration E2E contract", () => {
  test("health and OpenAPI are reachable", async (t) => {
    if (shouldSkipWithoutBaseUrl(t)) return;

    const health = await request("/health");
    assert.equal(health.response.status, 200);
    assert.match(JSON.stringify(health.body), /ok|healthy|up/i);

    const openapi = await request("/openapi.json");
    assert.equal(openapi.response.status, 200);
    assert.equal(openapi.body.openapi?.startsWith("3."), true);
  });

  test("OpenAPI exposes the Hades/Hermes migration surface with stable operation ids", async (t) => {
    if (shouldSkipWithoutBaseUrl(t)) return;

    const { response, body } = await request("/openapi.json");
    assert.equal(response.status, 200);

    const expectedRoutes = [
      ["post", "/api/hades/hermes/sessions"],
      ["post", "/api/hades/hermes/{profile_name}/media"],
      ["get", "/api/hades/hermes/{profile_name}/media/{attachment_id}"],
      ["post", "/api/hades/hermes/speak"],
      ["post", "/api/hades/hermes/transcribe"],
    ];

    for (const [method, route] of expectedRoutes) {
      assert.ok(body.paths?.[route]?.[method], `OpenAPI missing ${method.toUpperCase()} ${route}`);
      assert.ok(body.paths[route][method].operationId, `${method.toUpperCase()} ${route} needs operationId for SDK/contract stability.`);
    }

    const serialized = JSON.stringify(body);
    for (const tag of ["auth", "hades", "hermes", "media"]) {
      assert.match(serialized, new RegExp(tag, "i"), `OpenAPI must include ${tag} tag/contract surface.`);
    }
  });

  test("Hermes session bootstrap fails closed without auth", async (t) => {
    if (shouldSkipWithoutBaseUrl(t)) return;

    const { response, text } = await request("/api/hades/hermes/sessions", {
      method: "POST",
      body: JSON.stringify({ context: "minions" }),
    });

    assert.ok([401, 403].includes(response.status), `Expected 401/403, got ${response.status}: ${text}`);
    assert.doesNotMatch(text, /anonymous_anonymous|apiServerKey|API_SERVER_KEY|OPENROUTER_API_KEY|GROQ_API_KEY/);
  });

  test("authenticated Hermes session bootstrap returns edge route only and no secrets", async (t) => {
    if (shouldSkipWithoutAuth(t)) return;

    const { response, body, text } = await request("/api/hades/hermes/sessions", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ context: "minions" }),
    });

    assert.ok([200, 201].includes(response.status), `Expected 200/201, got ${response.status}: ${text}`);
    assert.equal(body.authMode, "edge_injected");
    assert.match(body.hermesApiBaseUrl, /\/api\/hades\/hermes\/[^/]+\/v1$/);
    assert.ok(body.profileName);

    for (const forbidden of ["apiServerKey", "API_SERVER_KEY", "OPENROUTER_API_KEY", "GROQ_API_KEY", "TELEGRAM_BOT_TOKEN"]) {
      assert.equal(JSON.stringify(body).includes(forbidden), false, `Session response leaked ${forbidden}`);
    }
  });

  test("authenticated media upload accepts image fixtures and returns a retrievable attachment route", async (t) => {
    if (shouldSkipWithoutAuth(t)) return;

    const session = await request("/api/hades/hermes/sessions", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ context: "minions" }),
    });
    assert.ok([200, 201].includes(session.response.status), `Session bootstrap failed: ${session.text}`);

    let imageBytes;
    try {
      imageBytes = readFileSync(sampleImagePath);
    } catch {
      t.skip(`Sample image not found at ${sampleImagePath}`);
    }

    const form = new FormData();
    form.set("file", new Blob([imageBytes], { type: "image/png" }), "sample-image.png");

    const upload = await request(`/api/hades/hermes/${session.body.profileName}/media`, {
      method: "POST",
      headers: authHeaders(),
      body: form,
    });

    assert.ok([200, 201].includes(upload.response.status), `Upload failed: ${upload.text}`);
    assert.ok(upload.body.attachmentId || upload.body.id, "Upload response must include attachmentId/id.");
    assert.match(upload.body.url || upload.body.downloadUrl || "", /\/api\/hades\/hermes\/.+\/media\//);
  });
});
