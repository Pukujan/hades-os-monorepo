import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createHadesService } from "../../services/hades.service.js";
import { createConversationRepository } from "../../repositories/conversationRepository.js";
import { createAgentExecutionRepository } from "../../repositories/agentExecutionRepository.js";

const AUTH = { userId: "integration-u1", tenantId: "integration-t1" };
const COMPOSIO_CONNECT_LINK_URL = "https://backend.composio.dev/api/v3/connected_accounts/link";

/**
 * Integration tests that test the REAL createInstagramAuthLink function,
 * with only fetch() mocked to simulate Composio API responses.
 */

describe("Instagram connect — real code path", () => {
  let originalFetch;
  let fetchCalls;
  let originalEnv;

  before(() => {
    originalFetch = global.fetch;
    originalEnv = { ...process.env };
  });

  after(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  function createService(overrides = {}) {
    return createHadesService({
      repository: { saveAgentExecution: async () => null, getOrCreateConversation: async () => ({ id: "test-conv" }), listMessages: async () => [] },
      scopedRepos: {
        conversations: createConversationRepository({ storage: "memory" }),
        executions: createAgentExecutionRepository({ storage: "memory" }),
      },
      hermes: {
        buildResponse: async () => ({
          assistantText: "test",
          reply: "test",
          source: "test",
          actions: [],
          cards: [],
          suggestions: [],
          draft: { category: null, targetSocial: null, triggerType: null, status: "idle", content: "" },
          missingFields: [],
          sessionId: null,
          assistantMessage: { role: "assistant", content: "test", status: "completed", suggestions: [], actions: [] },
        }),
      },
      ...overrides,
    });
  }

  function mockComposio(responseStatus, responseBody) {
    fetchCalls = [];
    global.fetch = async (url, options) => {
      fetchCalls.push({ url, method: options?.method, headers: options?.headers, body: JSON.parse(options?.body || "{}") });
      return {
        ok: responseStatus >= 200 && responseStatus < 300,
        status: responseStatus,
        json: async () => responseBody,
        text: async () => JSON.stringify(responseBody),
      };
    };
  }

  test("fails with 400 when connector is not composio", async () => {
    const service = createService();
    const body = { connector: "custom_oauth" };

    try {
      await service.createInstagramAuthLink(body, AUTH);
      assert.fail("Should have thrown");
    } catch (err) {
      assert.equal(err.status, 400);
      assert.ok(err.message.includes("Unsupported Instagram connector"));
    }
  });

  test("fails with 501 when COMPOSIO_API_KEY is not set", async () => {
    delete process.env.COMPOSIO_API_KEY;
    process.env.COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID = "ac_test123";
    const service = createService();

    try {
      await service.createInstagramAuthLink({ connector: "composio" }, AUTH);
      assert.fail("Should have thrown");
    } catch (err) {
      assert.equal(err.status, 501);
      assert.ok(err.message.includes("COMPOSIO_API_KEY"));
    }
  });

  test("fails with 501 when COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID is not set", async () => {
    process.env.COMPOSIO_API_KEY = "test-api-key";
    delete process.env.COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID;
    const service = createService();

    try {
      await service.createInstagramAuthLink({ connector: "composio" }, AUTH);
      assert.fail("Should have thrown");
    } catch (err) {
      assert.equal(err.status, 501);
      assert.ok(err.message.includes("COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID"));
    }
  });

  test("calls Composio API with correct URL v3 (not v3.1)", async () => {
    process.env.COMPOSIO_API_KEY = "test-api-key";
    process.env.COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID = "ac_test123";
    mockComposio(200, { redirect_url: "https://composio.dev/auth/instagram", connected_account_id: "ca-123" });
    const service = createService();

    const result = await service.createInstagramAuthLink({ connector: "composio" }, AUTH);

    assert.ok(fetchCalls.length > 0, "Should have called fetch");
    assert.equal(fetchCalls[0].url, COMPOSIO_CONNECT_LINK_URL);
    assert.equal(fetchCalls[0].method, "POST");
    assert.equal(fetchCalls[0].headers["x-api-key"], "test-api-key");
  });

  test("sends correct body to Composio API", async () => {
    process.env.COMPOSIO_API_KEY = "test-api-key";
    process.env.COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID = "ac_test123";
    mockComposio(200, { redirect_url: "https://composio.dev/auth/instagram", connected_account_id: "ca-123" });
    const service = createService();

    await service.createInstagramAuthLink({ connector: "composio" }, AUTH);

    const body = fetchCalls[0].body;
    assert.equal(body.auth_config_id, "ac_test123");
    assert.equal(body.user_id, "integration-u1");
    assert.ok(body.alias.startsWith("hades-integration-t1-instagram-"), "Alias should start with prefix and have timestamp suffix");
    assert.ok(body.callback_url.includes("provider=instagram"));
  });

  test("returns authUrl from Composio on success", async () => {
    process.env.COMPOSIO_API_KEY = "test-api-key";
    process.env.COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID = "ac_test123";
    mockComposio(200, { redirect_url: "https://composio.dev/auth/instagram/xyz", connected_account_id: "ca-456" });
    const service = createService();

    const result = await service.createInstagramAuthLink({ connector: "composio" }, AUTH);

    assert.equal(result.provider, "instagram");
    assert.equal(result.connector, "composio");
    assert.equal(result.authUrl, "https://composio.dev/auth/instagram/xyz");
    assert.equal(result.connectionIntentId, "ca-456");
  });

  test("accepts redirectUrl field (lowercase) from Composio", async () => {
    process.env.COMPOSIO_API_KEY = "test-api-key";
    process.env.COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID = "ac_test123";
    mockComposio(200, { redirectUrl: "https://composio.dev/auth/alt", connected_account_id: "ca-789" });
    const service = createService();

    const result = await service.createInstagramAuthLink({ connector: "composio" }, AUTH);

    assert.equal(result.authUrl, "https://composio.dev/auth/alt");
  });

  test("propagates 400 from Composio API when auth_config_id is invalid", async () => {
    process.env.COMPOSIO_API_KEY = "test-api-key";
    process.env.COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID = "ac_invalid";
    mockComposio(400, { error: "Invalid auth_config_id" });
    const service = createService();

    try {
      await service.createInstagramAuthLink({ connector: "composio" }, AUTH);
      assert.fail("Should have thrown");
    } catch (err) {
      assert.equal(err.status, 400);
      assert.ok(err.message.includes("Invalid auth_config_id"));
    }
  });

  test("propagates 401 from Composio API when API key is invalid", async () => {
    process.env.COMPOSIO_API_KEY = "bad-api-key";
    process.env.COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID = "ac_test123";
    mockComposio(401, { error: "Invalid API key" });
    const service = createService();

    try {
      await service.createInstagramAuthLink({ connector: "composio" }, AUTH);
      assert.fail("Should have thrown");
    } catch (err) {
      assert.equal(err.status, 401);
      assert.ok(err.message.includes("Invalid API key"));
    }
  });

  test("fails with 502 when Composio returns no redirect_url", async () => {
    process.env.COMPOSIO_API_KEY = "test-api-key";
    process.env.COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID = "ac_test123";
    mockComposio(200, { status: "pending" });
    const service = createService();

    try {
      await service.createInstagramAuthLink({ connector: "composio" }, AUTH);
      assert.fail("Should have thrown");
    } catch (err) {
      assert.equal(err.status, 502);
      assert.ok(err.message.includes("redirect_url"));
    }
  });

  test("defaults connector to composio when body is empty", async () => {
    delete process.env.COMPOSIO_API_KEY;
    delete process.env.COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID;
    const service = createService();

    try {
      await service.createInstagramAuthLink({}, AUTH);
      assert.fail("Should have thrown");
    } catch (err) {
      // connector defaults to "composio", so it passes connector check
      // then fails at env var check with 501
      assert.equal(err.status, 501);
      assert.ok(err.message.includes("COMPOSIO_API_KEY") || err.message.includes("COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID"));
    }
  });

  test("resolves userId from authContext", async () => {
    process.env.COMPOSIO_API_KEY = "test-api-key";
    process.env.COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID = "ac_test123";
    mockComposio(200, { redirect_url: "https://composio.dev/auth/user", connected_account_id: "ca-user-1" });
    const service = createService();

    await service.createInstagramAuthLink(
      { connector: "composio" },
      { userId: "specific-user-id", tenantId: "specific-tenant" }
    );

    assert.equal(fetchCalls[0].body.user_id, "specific-user-id");
  });

  test("uses APP_URL env var as callback base when set", async () => {
    process.env.COMPOSIO_API_KEY = "test-api-key";
    process.env.COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID = "ac_test123";
    process.env.APP_URL = "https://myapp.com";
    mockComposio(200, { redirect_url: "https://composio.dev/auth/x", connected_account_id: "ca-x" });
    const service = createService();

    await service.createInstagramAuthLink({ connector: "composio" }, AUTH);

    assert.ok(fetchCalls[0].body.callback_url.startsWith("https://myapp.com"));
  });
});
