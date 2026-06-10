import { test } from "node:test";
import assert from "node:assert/strict";

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
    });

    assert.equal(calls[0].url.endsWith("/api/hades/chat"), true);
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

