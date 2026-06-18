import { test, describe } from "node:test";
import assert from "node:assert/strict";

const enabled = process.env.HADES_AUTONOMOUS_HERMES_E2E === "1";
const baseUrl = process.env.HADES_E2E_BASE_URL;
const authToken = process.env.HADES_E2E_AUTH_TOKEN;
const telegramE2EEnabled = process.env.HADES_AUTONOMOUS_HERMES_TELEGRAM_E2E === "1";

function assertNoSecrets(value) {
  const serialized = JSON.stringify(value);
  assert.equal(serialized.includes("SUPABASE_SERVICE_ROLE"), false);
  assert.equal(serialized.includes("OPENROUTER_API_KEY"), false);
  assert.equal(serialized.includes("TELEGRAM_BOT_TOKEN"), false);
  assert.equal(serialized.includes("DISCORD_BOT_TOKEN"), false);
  assert.equal(serialized.includes("sk-"), false);
  assert.equal(serialized.includes("raw-token"), false);
}

function requireE2E(t) {
  if (!enabled) {
    t.skip("Set HADES_AUTONOMOUS_HERMES_E2E=1 to run Railway/browser autonomous Hermes E2E checks.");
    return false;
  }
  assert.ok(baseUrl, "HADES_E2E_BASE_URL is required for autonomous Hermes E2E");
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

async function request(path, options = {}) {
  const headers = {
    accept: "application/json",
    ...(options.headers || {}),
  };
  if (authToken) headers.authorization = `Bearer ${authToken}`;

  const response = await fetch(new URL(path, baseUrl), {
    ...options,
    headers,
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { response, body, text };
}

describe("Autonomous Hermes Railway/browser E2E TDD contract", () => {
  test("runtime status endpoint reports mode, isolation, and redacted process state", async (t) => {
    if (!requireE2E(t)) return;

    const { response, body, text } = await request("/api/hades/hermes/status");

    assert.equal(response.ok, true, text);
    assert.match(body.runtimeMode, /oneshot|warm|daemon/);
    assert.equal(typeof body.workspaceRoot, "string");
    assert.ok(["supabase", "r2", "memory", "disabled"].includes(body.stateStore));
    assert.ok(["supabase", "r2", "memory", "disabled"].includes(body.objectStore || body.stateStore));
    assertNoSecrets(body);
  });

  test("full pipeline creates a task, persists route metadata, and updates runtime status", async (t) => {
    if (!requireE2E(t)) return;

    const payload = {
      clientMessageId: `e2e-full-${Date.now()}`,
      idempotencyKey: `e2e-full-${Date.now()}`,
      message: "Reply with JSON-safe text: autonomous Hermes Supabase bridge e2e ok",
    };

    const task = await request("/api/hades/hermes/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    assert.equal(task.response.ok, true, task.text);
    assert.ok(task.body.taskId);
    assert.ok(task.body.routingTokenStatus === "issued" || task.body.routingTokenStatus === "verified");
    assert.ok(task.body.reply || task.body.assistantText || task.body.status);
    assertNoSecrets(task.body);

    const status = await request("/api/hades/hermes/status");
    assert.equal(status.response.ok, true, status.text);
    assert.ok(status.body.lastRunAt || status.body.activeRuntimes || status.body.totalRuns >= 1);
    assertNoSecrets(status.body);
  });

  test("state endpoint proves Supabase bridge metadata is scoped and redacted", async (t) => {
    if (!requireE2E(t)) return;

    const { response, body, text } = await request("/api/hades/hermes/state");

    assert.equal(response.ok, true, text);
    assert.ok(Array.isArray(body.objects));
    assertNoSecrets(body);
    for (const object of body.objects) {
      assert.ok(object.objectKey || object.object_key);
      assert.ok(object.contentHash || object.content_hash || object.etag);
      assert.equal(Object.hasOwn(object, "body"), false);
      assert.equal(Object.hasOwn(object, "rawBody"), false);
    }
  });

  test("skills endpoint is scoped, redacted, and backed by hydrated state metadata", async (t) => {
    if (!requireE2E(t)) return;

    const { response, body, text } = await request("/api/hades/hermes/skills");

    assert.equal(response.ok, true, text);
    assert.ok(Array.isArray(body.skills));
    assertNoSecrets(body);
    for (const skill of body.skills) {
      assert.ok(skill.name);
      assert.ok(skill.contentHash || skill.content_hash);
      assert.equal(Object.hasOwn(skill, "rawSecret"), false);
      assert.equal(Object.hasOwn(skill, "content"), false);
    }
  });

  test("artifact-backed Telegram media proposal returns scoped artifact pointers and signed URL status", async (t) => {
    if (!requireE2E(t)) return;

    const payload = {
      clientMessageId: `e2e-media-${Date.now()}`,
      idempotencyKey: `e2e-media-${Date.now()}`,
      message: "Create or find a safe cat GIF and propose sending it to this Telegram chat.",
    };

    const result = await request("/api/hades/hermes/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    assert.equal(result.response.ok, true, result.text);
    assert.ok(result.body.taskId);
    assert.ok(result.body.routingTokenStatus === "issued" || result.body.routingTokenStatus === "verified");
    assert.ok(Array.isArray(result.body.artifacts) || Array.isArray(result.body.proposedActions));
    assertNoSecrets(result.body);

    const serialized = JSON.stringify(result.body);
    assert.match(serialized, /artifact|objectKey|object_key|signedUrlStatus|proposedActions/i);
  });

  test("real Telegram delivery is opt-in and verifies Hades-owned boundary send", async (t) => {
    if (!requireTelegramE2E(t)) return;

    const payload = {
      clientMessageId: `e2e-telegram-${Date.now()}`,
      idempotencyKey: `e2e-telegram-${Date.now()}`,
      message: "Create or find a safe tiny cat GIF and send it through the verified Telegram test chat.",
      boundaryAction: {
        provider: "telegram",
        type: "send_animation",
      },
    };

    const result = await request("/api/hades/hermes/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    assert.equal(result.response.ok, true, result.text);
    assert.ok(result.body.taskId);
    assert.ok(result.body.boundaryActionStatus === "executed" || result.body.deliveryStatus === "sent");
    assert.ok(result.body.providerMessageId || result.body.telegramMessageId || result.body.deliveredAt);
    assertNoSecrets(result.body);
  });
});
