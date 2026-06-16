import { test, describe } from "node:test";
import assert from "node:assert/strict";

const TEST_TOKEN = "test-access-token";

describe("saveTelegramToken", () => {
  let originalFetch;

  function mockFetch(response) {
    originalFetch = global.fetch;
    global.fetch = async (url, options) => {
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    };
  }

  function mockFetchError(status, body) {
    originalFetch = global.fetch;
    global.fetch = async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" }
      });
  }

  function restoreFetch() {
    global.fetch = originalFetch;
  }

  test("calls apiPost with correct path and body and auth header", async () => {
    const fakeToken = "1234567890:ABCdefGHIjklmNOpqrsTUVwxyz";
    const fakeResponse = { ok: true, token_last4: "xyz0" };
    const calls = [];

    originalFetch = global.fetch;
    global.fetch = async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify(fakeResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    };

    try {
      const { saveTelegramToken } = await import("../../services/hadesApi.js");
      const result = await saveTelegramToken({ token: fakeToken }, TEST_TOKEN);

      assert.equal(calls.length, 1);
      assert.ok(calls[0].url.includes("/api/hades/socials/telegram/token"));
      assert.equal(calls[0].options.method, "POST");
      assert.equal(calls[0].options.headers.authorization, `Bearer ${TEST_TOKEN}`);
      const body = JSON.parse(calls[0].options.body);
      assert.equal(body.token, fakeToken);
      assert.equal(result.ok, true);
    } finally {
      global.fetch = originalFetch;
    }
  });

  test("returns connection data on success", async () => {
    const fakeResponse = {
      connection: {
        status: "connected",
        botUsername: "hades_test_minion_bot",
        token_last4: "1234"
      }
    };

    mockFetch(fakeResponse);

    try {
      const { saveTelegramToken } = await import("../../services/hadesApi.js");
      const result = await saveTelegramToken({ token: "test:token" }, TEST_TOKEN);

      assert.equal(result.connection.status, "connected");
      assert.equal(result.connection.botUsername, "hades_test_minion_bot");
      assert.equal(result.connection.token_last4, "1234");
    } finally {
      restoreFetch();
    }
  });

  test("throws on api error", async () => {
    mockFetchError(400, { error: "Invalid token", code: "token_invalid" });

    try {
      const { saveTelegramToken } = await import("../../services/hadesApi.js");

      await assert.rejects(
        () => saveTelegramToken({ token: "bad:token" }, TEST_TOKEN)
      );
    } finally {
      restoreFetch();
    }
  });
});
