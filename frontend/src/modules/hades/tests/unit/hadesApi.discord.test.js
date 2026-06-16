import { test, describe } from "node:test";
import assert from "node:assert/strict";

const TEST_TOKEN = "test-access-token";

describe("saveDiscordToken", () => {
  test("calls apiPost with correct path and body and auth header", async () => {
    const fakeToken = "discord_bot_token_123";
    const fakeResponse = { ok: true, token_last4: "1234" };
    const calls = [];

    const originalFetch = global.fetch;
    global.fetch = async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify(fakeResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    };

    try {
      const { saveDiscordToken } = await import("../../services/hadesApi.js");
      const result = await saveDiscordToken({ token: fakeToken }, TEST_TOKEN);

      assert.equal(calls.length, 1);
      assert.ok(calls[0].url.includes("/api/hades/socials/discord/token"));
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
    const originalFetch = global.fetch;
    global.fetch = async () =>
      new Response(JSON.stringify({
        connection: {
          status: "connected",
          botUsername: "HadesBot#1234",
          token_last4: "abcd"
        }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

    try {
      const { saveDiscordToken } = await import("../../services/hadesApi.js");
      const result = await saveDiscordToken({ token: "test:token" }, TEST_TOKEN);

      assert.equal(result.connection.status, "connected");
      assert.equal(result.connection.botUsername, "HadesBot#1234");
      assert.equal(result.connection.token_last4, "abcd");
    } finally {
      global.fetch = originalFetch;
    }
  });

  test("throws on api error", async () => {
    const originalFetch = global.fetch;
    global.fetch = async () =>
      new Response(JSON.stringify({ error: "Invalid token", code: "token_invalid" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });

    try {
      const { saveDiscordToken } = await import("../../services/hadesApi.js");
      await assert.rejects(
        () => saveDiscordToken({ token: "bad:token" }, TEST_TOKEN)
      );
    } finally {
      global.fetch = originalFetch;
    }
  });
});
