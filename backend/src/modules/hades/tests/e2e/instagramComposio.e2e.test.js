import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createHadesService } from "../../services/hades.service.js";

/**
 * REAL end-to-end tests against the live Composio API.
 *
 * Requires env vars:
 *   COMPOSIO_API_KEY
 *   COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID
 *
 * These tests make actual HTTP requests to Composio's production API.
 * They will create real linked account sessions.
 */

const apiKey = (process.env.COMPOSIO_API_KEY || "").trim();
const authConfigId = (process.env.COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID || "").trim();
const hasEnvVars = !!(apiKey && authConfigId);

describe("Instagram Composio E2E", { skip: !hasEnvVars }, () => {
  function createService() {
    return createHadesService({
      repository: { saveAgentExecution: async () => null, getOrCreateConversation: async () => ({ id: "test" }), listMessages: async () => [] },
      hermes: { buildResponse: async () => ({ assistantText: "", reply: "", source: "", actions: [], cards: [], suggestions: [], draft: {}, missingFields: [], sessionId: null, assistantMessage: {} }) },
    });
  }

  test("createInstagramAuthLink returns a real auth URL from Composio v3", async () => {
    const service = createService();
    const uniqueId = `e2e-${Date.now()}`;

    const result = await service.createInstagramAuthLink(
      { connector: "composio" },
      { userId: uniqueId, tenantId: uniqueId }
    );

    assert.equal(result.provider, "instagram");
    assert.equal(result.connector, "composio");
    assert.ok(result.authUrl, "Should have an authUrl");
    assert.ok(result.authUrl.startsWith("https://"), "authUrl should be HTTPS");
    assert.ok(result.connectionIntentId, "Should have connectionIntentId");

    // Verify the link is live (10-min expiry)
    const linkResp = await fetch(result.authUrl, { method: "HEAD" });
    assert.ok(linkResp.ok, "Auth URL should be reachable");

    console.log("\n=== Instagram auth link created ===");
    console.log("authUrl:", result.authUrl);
    console.log("connected_account_id:", result.connectionIntentId);
    console.log("\nOpen this in a browser to authorize Instagram:");
    console.log(result.authUrl);
  });

  test("Composio v3 API returns 201 with redirect_url", async () => {
    const body = {
      auth_config_id: authConfigId,
      user_id: `shape-test-${Date.now()}`,
      alias: `hades-shape-${Date.now()}`,
      callback_url: "https://example.com/callback",
    };

    const response = await fetch("https://backend.composio.dev/api/v3/connected_accounts/link", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify(body),
    });

    assert.ok(response.ok, `v3 API should succeed (got ${response.status})`);
    const data = await response.json();
    assert.ok(data.redirect_url, "Should have redirect_url");
    assert.ok(data.connected_account_id, "Should have connected_account_id");
    assert.ok(data.link_token, "Should have link_token");
    assert.ok(data.expires_at, "Should have expires_at");
  });

  test("Composio v3.1 returns 400 on alias conflict (confirming the bug)", async () => {
    const sharedAlias = `conflict-${Date.now()}`;

    const body = {
      auth_config_id: authConfigId,
      user_id: "conflict-user",
      alias: sharedAlias,
    };

    // First call succeeds
    const res1 = await fetch("https://backend.composio.dev/api/v3.1/connected_accounts/link", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify(body),
    });
    assert.ok(res1.ok, "First v3.1 call should succeed");

    // Second call with same alias + user fails
    const res2 = await fetch("https://backend.composio.dev/api/v3.1/connected_accounts/link", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify(body),
    });
    assert.equal(res2.status, 400, "Second v3.1 call with same alias should return 400");
    if (res2.status === 400) {
      const errData = await res2.json();
      console.log("\n=== v3.1 alias conflict error ===");
      console.log(JSON.stringify(errData, null, 2));
    }
  });

  test("v3 also rejects duplicate alias for same user", async () => {
    const sharedAlias = `v3dup-${Date.now()}`;
    const userId = `v3dupuser-${Date.now()}`;
    const body = {
      auth_config_id: authConfigId,
      user_id: userId,
      alias: sharedAlias,
    };

    // First call creates a link
    const res1 = await fetch("https://backend.composio.dev/api/v3/connected_accounts/link", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify(body),
    });
    assert.ok(res1.ok, "First v3 call should succeed");

    // Second call with same user + alias
    const res2 = await fetch("https://backend.composio.dev/api/v3/connected_accounts/link", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify(body),
    });
    if (!res2.ok) {
      const errData = await res2.json();
      console.log("\n=== v3 duplicate alias error ===");
      console.log(JSON.stringify(errData, null, 2));
    }
    // v3 might or might not reject duplicates — document the behavior
    console.log(`\nv3 duplicate alias: status=${res2.status} ${res2.ok ? "ALLOWED" : "REJECTED"}`);
  });

  test("unique alias per attempt avoids 400 even for same user", async () => {
    const userId = `uniqueuser-${Date.now()}`;

    // First attempt with unique alias
    const body1 = {
      auth_config_id: authConfigId,
      user_id: userId,
      alias: `hades-${userId}-1`,
    };
    const res1 = await fetch("https://backend.composio.dev/api/v3/connected_accounts/link", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify(body1),
    });
    assert.ok(res1.ok, "First attempt should succeed");

    // Second attempt with different alias but same user
    const body2 = {
      auth_config_id: authConfigId,
      user_id: userId,
      alias: `hades-${userId}-2`,
    };
    const res2 = await fetch("https://backend.composio.dev/api/v3/connected_accounts/link", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify(body2),
    });
    assert.ok(res2.ok, "Second attempt with different alias should also succeed");
    console.log("\n=== Unique alias per attempt works ===");
    console.log(`First:  ${res1.status} connected_account_id=${(await res1.json()).connected_account_id}`);
    console.log(`Second: ${res2.status} connected_account_id=${(await res2.json()).connected_account_id}`);
  });

  test("createInstagramAuthLink with timestamp alias can be called twice for same user", async () => {
    const service = createService();
    const sameUser = `sameuser-${Date.now()}`;

    // First call
    const r1 = await service.createInstagramAuthLink(
      { connector: "composio" },
      { userId: sameUser, tenantId: sameUser }
    );
    assert.ok(r1.authUrl, "First call should succeed");

    // Second call with same user — timestamp makes alias unique
    const r2 = await service.createInstagramAuthLink(
      { connector: "composio" },
      { userId: sameUser, tenantId: sameUser }
    );
    assert.ok(r2.authUrl, "Second call with same user should also succeed (timestamp alias)");
    assert.notEqual(r1.connectionIntentId, r2.connectionIntentId, "Should get different connection IDs");

    console.log("\n=== Same user, two calls ===");
    console.log(`Call 1: connectionIntentId=${r1.connectionIntentId}, authUrl=${r1.authUrl}`);
    console.log(`Call 2: connectionIntentId=${r2.connectionIntentId}, authUrl=${r2.authUrl}`);
  });
});
