import { test, describe } from "node:test";
import assert from "node:assert/strict";

const TEST_TOKEN = "test-access-token";

describe("frontend chat context", () => {
  test("postHadesChat forwards context field in POST body", async () => {
    const calls = [];
    const originalFetch = global.fetch;
    global.fetch = async (url, options) => {
      calls.push({ url, headers: options.headers, body: JSON.parse(options.body) });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    try {
      const { postHadesChat } = await import("../../services/hadesApi.js");

      await postHadesChat({
        clientMessageId: "msg-ctx-1",
        idempotencyKey: "idem-ctx-1",
        message: "create a task minion",
        context: "forge",
      }, TEST_TOKEN);

      assert.equal(calls.length, 1);
      assert.equal(calls[0].headers.authorization, `Bearer ${TEST_TOKEN}`);
      assert.equal(
        calls[0].body.context,
        "forge",
        "POST body should include context field when caller provides it"
      );
    } finally {
      global.fetch = originalFetch;
    }
  });

  test("postHadesChat without context still works (backward compat)", async () => {
    const calls = [];
    const originalFetch = global.fetch;
    global.fetch = async (url, options) => {
      calls.push({ headers: options.headers, body: JSON.parse(options.body) });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    try {
      const { postHadesChat } = await import("../../services/hadesApi.js");

      await postHadesChat({
        clientMessageId: "msg-noctx-1",
        idempotencyKey: "idem-noctx-1",
        message: "hello",
      }, TEST_TOKEN);

      assert.equal(calls.length, 1);
      assert.equal(calls[0].headers.authorization, `Bearer ${TEST_TOKEN}`);
      assert.equal(calls[0].body.message, "hello");
      assert.equal(calls[0].body.context, undefined, "context should be optional");
    } finally {
      global.fetch = originalFetch;
    }
  });
});
