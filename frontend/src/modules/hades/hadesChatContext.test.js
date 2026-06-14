import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("frontend chat context", () => {
  test("postHadesChat forwards context field in POST body", async () => {
    const calls = [];
    const originalFetch = global.fetch;
    global.fetch = async (url, options) => {
      calls.push({ url, body: JSON.parse(options.body) });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    try {
      const { postHadesChat } = await import("./hadesApi.js");

      await postHadesChat({
        clientMessageId: "msg-ctx-1",
        idempotencyKey: "idem-ctx-1",
        message: "create a task minion",
        context: "forge",
      });

      assert.equal(calls.length, 1);
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
      calls.push({ body: JSON.parse(options.body) });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    try {
      const { postHadesChat } = await import("./hadesApi.js");

      await postHadesChat({
        clientMessageId: "msg-noctx-1",
        idempotencyKey: "idem-noctx-1",
        message: "hello",
      });

      assert.equal(calls.length, 1);
      assert.equal(calls[0].body.message, "hello");
      assert.equal(calls[0].body.context, undefined, "context should be optional");
    } finally {
      global.fetch = originalFetch;
    }
  });
});
