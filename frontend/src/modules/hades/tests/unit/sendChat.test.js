import { test } from "node:test";
import assert from "node:assert/strict";

const TEST_TOKEN = "test-access-token";

test("sendGeneralChat posts to /chat/general with correct payload", async () => {
  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  try {
    const { sendGeneralChat } = await import("../../hadesApi.js");
    const result = await sendGeneralChat({
      message: "where do I connect telegram?",
      conversationId: "conv-1",
      idempotencyKey: "idem-1",
      clientMessageId: "msg-1",
    }, TEST_TOKEN);

    assert.equal(calls.length, 1);
    assert.ok(calls[0].url.includes("/api/hades/chat/general"));
    assert.equal(calls[0].options.headers.authorization, `Bearer ${TEST_TOKEN}`);
    const body = JSON.parse(calls[0].options.body);
    assert.equal(body.message, "where do I connect telegram?");
    assert.equal(body.conversationId, "conv-1");
    assert.ok(result.ok);
  } finally {
    global.fetch = originalFetch;
  }
});

test("sendForgeChat posts to /chat/forge with correct payload", async () => {
  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  try {
    const { sendForgeChat } = await import("../../hadesApi.js");
    const result = await sendForgeChat({
      message: "make a telegram minion",
      idempotencyKey: "idem-2",
    }, TEST_TOKEN);

    assert.equal(calls.length, 1);
    assert.ok(calls[0].url.includes("/api/hades/chat/forge"));
    assert.equal(calls[0].options.headers.authorization, `Bearer ${TEST_TOKEN}`);
    const body = JSON.parse(calls[0].options.body);
    assert.equal(body.message, "make a telegram minion");
    assert.ok(result.ok);
  } finally {
    global.fetch = originalFetch;
  }
});
