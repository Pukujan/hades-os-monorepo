import { test } from "node:test";
import assert from "node:assert/strict";

const TEST_TOKEN = "test-access-token";

test("hades api posts chat payload to the backend route", async () => {
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
    const { postHadesChat, buildLocalDraftFallback } = await import("./hadesApi.js");
    await postHadesChat({
      clientMessageId: "msg-1",
      idempotencyKey: "idem-1",
      message: "hello",
      currentDraft: { name: null }
    }, TEST_TOKEN);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url.endsWith("/api/hades/chat"), true);
    assert.equal(calls[0].options.headers.authorization, `Bearer ${TEST_TOKEN}`);
    const body = JSON.parse(calls[0].options.body);
    assert.equal(body.clientMessageId, "msg-1");

    const fallback = buildLocalDraftFallback("I want a command to send cat memes in Discord", {
      status: "incomplete"
    });
    assert.ok(fallback.draft.name);
  } finally {
    global.fetch = originalFetch;
  }
});

test("hades api deleteHadesMessages calls DELETE on the backend route", async () => {
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
    const { deleteHadesMessages } = await import("./hadesApi.js");
    const result = await deleteHadesMessages("conv-123", TEST_TOKEN);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.method, "DELETE");
    assert.equal(calls[0].options.headers.authorization, `Bearer ${TEST_TOKEN}`);
    assert.ok(calls[0].url.includes("/api/hades/conversations/conv-123/messages"));
    assert.ok(result.ok);
  } finally {
    global.fetch = originalFetch;
  }
});
