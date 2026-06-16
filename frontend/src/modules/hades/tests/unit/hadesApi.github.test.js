import { test, describe } from "node:test";
import assert from "node:assert/strict";

const TEST_TOKEN = "test-access-token";

describe("saveGitHubToken", () => {
  test("calls apiPost with correct path and body and auth header", async () => {
    const fakeToken = "ghp_xxxxxxxxxxxxxxxxxxxx";
    const fakeResponse = { ok: true };
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
      const { saveGitHubToken } = await import("../../services/hadesApi.js");
      const result = await saveGitHubToken({ token: fakeToken }, TEST_TOKEN);

      assert.equal(calls.length, 1);
      assert.ok(calls[0].url.includes("/api/hades/socials/github/token"));
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
          username: "hades-user",
          scope: "repo"
        }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

    try {
      const { saveGitHubToken } = await import("../../services/hadesApi.js");
      const result = await saveGitHubToken({ token: "ghp_test" }, TEST_TOKEN);

      assert.equal(result.connection.status, "connected");
      assert.equal(result.connection.username, "hades-user");
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
      const { saveGitHubToken } = await import("../../services/hadesApi.js");
      await assert.rejects(
        () => saveGitHubToken({ token: "bad:token" }, TEST_TOKEN)
      );
    } finally {
      global.fetch = originalFetch;
    }
  });
});
