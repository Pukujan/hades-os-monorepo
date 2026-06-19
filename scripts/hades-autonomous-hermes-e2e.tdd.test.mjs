import { test, describe } from "node:test";
import assert from "node:assert/strict";

const enabled = process.env.HADES_AUTONOMOUS_HERMES_E2E === "1";
const hadesBaseUrl = process.env.HADES_E2E_BASE_URL;
const authToken = process.env.HADES_E2E_AUTH_TOKEN;
const telegramE2EEnabled = process.env.HADES_AUTONOMOUS_HERMES_TELEGRAM_E2E === "1";
const restartE2EEnabled = process.env.HADES_AUTONOMOUS_HERMES_RESTART_E2E === "1";
const restartHookUrl = process.env.HADES_E2E_RESTART_HOOK_URL;
const restartWaitMs = Number(process.env.HADES_E2E_RESTART_WAIT_MS || 30000);

function assertNoSecrets(value) {
  const serialized = JSON.stringify(value);
  assert.equal(serialized.includes("SUPABASE_SERVICE_ROLE"), false);
  assert.equal(serialized.includes("OPENROUTER_API_KEY"), false);
  assert.equal(serialized.includes("TELEGRAM_BOT_TOKEN"), false);
  assert.equal(serialized.includes("DISCORD_BOT_TOKEN"), false);
  assert.equal(serialized.includes("API_SERVER_KEY"), false);
  assert.equal(serialized.includes("sk-"), false);
  assert.equal(serialized.includes("raw-token"), false);
}

function requireE2E(t) {
  if (!enabled) {
    t.skip("Set HADES_AUTONOMOUS_HERMES_E2E=1 to run peer-model Hermes E2E checks.");
    return false;
  }
  assert.ok(hadesBaseUrl, "HADES_E2E_BASE_URL is required for peer-model Hermes E2E");
  assert.ok(authToken, "HADES_E2E_AUTH_TOKEN is required for peer-model Hermes E2E");
  return true;
}

function requireTelegramE2E(t) {
  if (!requireE2E(t)) return false;
  if (!telegramE2EEnabled) {
    t.skip("Set HADES_AUTONOMOUS_HERMES_TELEGRAM_E2E=1 to run real Telegram delivery E2E.");
    return false;
  }
  return true;
}

function requireRestartE2E(t) {
  if (!requireE2E(t)) return false;
  if (!restartE2EEnabled) {
    t.skip("Set HADES_AUTONOMOUS_HERMES_RESTART_E2E=1 to run restart durability E2E.");
    return false;
  }
  assert.ok(restartHookUrl, "HADES_E2E_RESTART_HOOK_URL is required for restart durability E2E");
  return true;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function jsonRequest(baseUrl, path, options = {}) {
  const headers = {
    accept: "application/json",
    ...(options.body ? { "content-type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(new URL(path, baseUrl), {
    ...options,
    headers,
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { response, body, text };
}

async function hadesRequest(path, options = {}) {
  return jsonRequest(hadesBaseUrl, path, {
    ...options,
    headers: {
      authorization: `Bearer ${authToken}`,
      ...(options.headers || {}),
    },
  });
}

async function startPeerSession() {
  const session = await hadesRequest("/api/hades/hermes/sessions", {
    method: "POST",
    body: JSON.stringify({
      clientSessionId: `e2e-session-${Date.now()}`,
      requestedSurface: "api_server",
    }),
  });

  assert.equal(session.response.ok, true, session.text);
  assert.equal(typeof session.body.profileName, "string");
  assert.equal(typeof session.body.hermesApiBaseUrl, "string");
  assert.equal(session.body.authMode, "edge_injected");
  assert.equal(Object.hasOwn(session.body, "apiServerKey"), false);
  assert.equal(Object.hasOwn(session.body, "hermesApiHeaders"), false);
  assertNoSecrets(session.body);
  return session.body;
}

async function hermesRequest(session, path, options = {}) {
  return jsonRequest(session.hermesApiBaseUrl, path, {
    ...options,
    headers: {
      authorization: `Bearer ${authToken}`,
      ...(options.headers || {}),
    },
  });
}

describe("Hades/Hermes peer-model E2E TDD contract", () => {
  test("Hades session bootstrap returns profile-scoped edge route without Hermes static auth", async (t) => {
    if (!requireE2E(t)) return;

    const session = await startPeerSession();

    assert.match(session.profileName, /tenant|user|profile/i);
    assert.doesNotMatch(session.hermesApiBaseUrl, /\/api\/hades\/hermes\/tasks/);
    assert.doesNotMatch(session.hermesApiBaseUrl, /127\.0\.0\.1|localhost/);
    assert.ok(session.routingToken || session.capabilityToken);
  });

  test("normal chat calls the returned edge route, not the Hades task proxy or raw profile port", async (t) => {
    if (!requireE2E(t)) return;

    const session = await startPeerSession();
    const result = await hermesRequest(session, "/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify({
        model: session.model || session.profileName,
        messages: [{ role: "user", content: "Reply with: peer model e2e ok" }],
        stream: false,
      }),
    });

    assert.equal(result.response.ok, true, result.text);
    assertNoSecrets(result.body);
    assert.ok(result.body.choices || result.body.output || result.body.response);
  });

  test("Hades no longer exposes the client-facing Hermes task proxy", async (t) => {
    if (!requireE2E(t)) return;

    const proxy = await hadesRequest("/api/hades/hermes/tasks", {
      method: "POST",
      body: JSON.stringify({ message: "this old proxy path should be gone" }),
    });

    assert.ok([404, 405, 410].includes(proxy.response.status), proxy.text);
    assertNoSecrets(proxy.body || {});
  });

  test("Hades state-index endpoint accepts Hermes audit metadata without raw task output", async (t) => {
    if (!requireE2E(t)) return;

    const session = await startPeerSession();
    const result = await hadesRequest("/api/hades/hermes/state-index", {
      method: "POST",
      body: JSON.stringify({
        profileName: session.profileName,
        eventType: "e2e_peer_session_started",
        objectKey: `profiles/${session.profileName}/sessions/e2e.json`,
        contentHash: "e2e-red-test-placeholder",
      }),
    });

    assert.equal(result.response.ok, true, result.text);
    assertNoSecrets(result.body);
    assert.equal(Object.hasOwn(result.body || {}, "rawOutput"), false);
    assert.equal(Object.hasOwn(result.body || {}, "body"), false);
  });

  test("same user keeps profile route and state-index metadata across service restart", async (t) => {
    if (!requireRestartE2E(t)) return;

    const marker = `restart-state-${Date.now()}`;
    const before = await startPeerSession();
    const write = await hadesRequest("/api/hades/hermes/state-index", {
      method: "POST",
      body: JSON.stringify({
        profileName: before.profileName,
        eventType: "e2e_restart_marker",
        objectKey: `profiles/${before.profileName}/sessions/${marker}.json`,
        contentHash: marker,
      }),
    });

    assert.equal(write.response.ok, true, write.text);
    assertNoSecrets(write.body);

    const restart = await fetch(restartHookUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${authToken}` },
    });
    assert.equal(restart.ok, true, await restart.text());
    await sleep(restartWaitMs);

    const after = await startPeerSession();
    assert.equal(after.profileName, before.profileName);
    assert.equal(after.hermesApiBaseUrl, before.hermesApiBaseUrl);

    const state = await hadesRequest(
      `/api/hades/hermes/state-index?profileName=${encodeURIComponent(after.profileName)}&contentHash=${encodeURIComponent(marker)}`
    );

    assert.equal(state.response.ok, true, state.text);
    assertNoSecrets(state.body);
    assert.equal(JSON.stringify(state.body).includes(marker), true);
    assert.equal(JSON.stringify(state.body).includes("API_SERVER_KEY"), false);
  });

  test("real Telegram delivery stays opt-in and goes through the chosen boundary path", async (t) => {
    if (!requireTelegramE2E(t)) return;

    const session = await startPeerSession();
    const result = await hadesRequest("/api/hades/hermes/boundary-actions", {
      method: "POST",
      body: JSON.stringify({
        profileName: session.profileName,
        routingToken: session.routingToken || session.capabilityToken,
        action: {
          provider: "telegram",
          type: "send_animation",
          text: "peer model Telegram GIF E2E",
        },
      }),
    });

    assert.equal(result.response.ok, true, result.text);
    assert.ok(result.body.boundaryActionStatus === "executed" || result.body.deliveryStatus === "sent");
    assert.ok(result.body.providerMessageId || result.body.telegramMessageId || result.body.deliveredAt);
    assertNoSecrets(result.body);
  });
});
