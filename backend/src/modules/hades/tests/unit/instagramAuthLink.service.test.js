import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createHadesService } from "../../services/hades.service.js";

async function withEnv(overrides, fn) {
  const previous = new Map();
  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, {
      had: Object.hasOwn(process.env, key),
      value: process.env[key],
    });
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  try {
    return await fn();
  } finally {
    for (const [key, snapshot] of previous.entries()) {
      if (snapshot.had) process.env[key] = snapshot.value;
      else delete process.env[key];
    }
  }
}

describe("Instagram auth link generation", () => {
  test("creates a real Composio connect link for the authenticated user", async () => {
    const calls = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      return new Response(
        JSON.stringify({
          redirect_url: "https://connect.composio.dev/link/abc123",
          connected_account_id: "ca_abc123",
        }),
        {
          status: 201,
          headers: { "content-type": "application/json" },
        }
      );
    };

    try {
      await withEnv(
        {
          COMPOSIO_API_KEY: "composio_api_key_123",
          COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID: "auth_config_instagram_123",
          APP_URL: "https://hades.example",
          CORS_ORIGIN: "https://frontend.example",
        },
        async () => {
          const service = createHadesService({ repository: {}, hermes: {} });
          const result = await service.createInstagramAuthLink(
            { connector: "composio" },
            { userId: "user_123", tenantId: "tenant_123" }
          );

          assert.equal(calls.length, 1);
          assert.equal(calls[0].url, "https://backend.composio.dev/api/v3/connected_accounts/link");
          assert.equal(calls[0].options.method, "POST");
          assert.equal(calls[0].options.headers["x-api-key"], "composio_api_key_123");
          assert.equal(calls[0].options.headers["Content-Type"], "application/json");

          const requestBody = JSON.parse(calls[0].options.body);
          assert.equal(requestBody.auth_config_id, "auth_config_instagram_123");
          assert.equal(requestBody.user_id, "user_123");
          assert.ok(requestBody.alias.startsWith("hades-tenant_123-instagram-"), "Alias should include timestamp suffix from production code");
          assert.equal(requestBody.callback_url, "https://hades.example/app/socials?provider=instagram");

          assert.equal(result.provider, "instagram");
          assert.equal(result.connector, "composio");
          assert.equal(result.authUrl, "https://connect.composio.dev/link/abc123");
          assert.equal(result.connectionIntentId, "ca_abc123");
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("fails clearly when Composio is not configured instead of returning a placeholder URL", async () => {
    const originalFetch = globalThis.fetch;
    let fetched = false;
    globalThis.fetch = async () => {
      fetched = true;
      throw new Error("should not fetch");
    };

    try {
      await withEnv(
        {
          COMPOSIO_API_KEY: undefined,
          COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID: undefined,
          APP_URL: undefined,
          CORS_ORIGIN: undefined,
        },
        async () => {
          const service = createHadesService({ repository: {}, hermes: {} });
          await assert.rejects(
            () => service.createInstagramAuthLink({ connector: "composio" }, { userId: "user_123", tenantId: "tenant_123" }),
            (error) => {
              assert.equal(error.status, 501);
              assert.match(error.message, /Instagram connect is not configured/i);
              return true;
            }
          );
          assert.equal(fetched, false);
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("callback_url falls back to CORS_ORIGIN when APP_URL is not set", async () => {
    const calls = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      return new Response(
        JSON.stringify({
          redirect_url: "https://connect.composio.dev/link/abc",
          connected_account_id: "ca_abc",
        }),
        { status: 201, headers: { "content-type": "application/json" } }
      );
    };

    try {
      await withEnv(
        {
          COMPOSIO_API_KEY: "key",
          COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID: "cfg",
          APP_URL: undefined,
          CORS_ORIGIN: "https://myapp.vercel.app",
        },
        async () => {
          const service = createHadesService({ repository: {}, hermes: {} });
          await service.createInstagramAuthLink(
            { connector: "composio" },
            { userId: "u1", tenantId: "t1" }
          );

          const body = JSON.parse(calls[0].options.body);
          assert.equal(body.callback_url, "https://myapp.vercel.app/app/socials?provider=instagram");
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("callback_url defaults to localhost:5173 when no APP_URL or CORS_ORIGIN is set", async () => {
    const calls = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      return new Response(
        JSON.stringify({
          redirect_url: "https://connect.composio.dev/link/def",
          connected_account_id: "ca_def",
        }),
        { status: 201, headers: { "content-type": "application/json" } }
      );
    };

    try {
      await withEnv(
        {
          COMPOSIO_API_KEY: "key",
          COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID: "cfg",
          APP_URL: undefined,
          CORS_ORIGIN: undefined,
        },
        async () => {
          const service = createHadesService({ repository: {}, hermes: {} });
          await service.createInstagramAuthLink(
            { connector: "composio" },
            { userId: "u2", tenantId: "t2" }
          );

          const body = JSON.parse(calls[0].options.body);
          assert.equal(body.callback_url, "http://localhost:5173/app/socials?provider=instagram");
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("saveInstagramConnection persists to instagramConnections repository", async () => {
    const saved = [];
    const scopedRepos = {
      instagramConnections: {
        createOrUpdate: async (data) => { saved.push(data); },
      },
    };

    const service = createHadesService({ repository: {}, hermes: {}, scopedRepos });

    const result = await service.saveInstagramConnection(
      {
        connector: "composio",
        externalConnectionId: "ca_composio_789",
        instagramBusinessAccountId: "ig_biz_123",
        handle: "my_instagram",
      },
      { userId: "user_save", tenantId: "tenant_save" }
    );

    assert.equal(result.provider, "instagram");
    assert.equal(result.status, "connected");
    assert.equal(result.handle, "my_instagram");

    assert.equal(saved.length, 1);
    assert.equal(saved[0].userId, "user_save");
    assert.equal(saved[0].tenantId, "tenant_save");
    assert.equal(saved[0].externalConnectionId, "ca_composio_789");
    assert.equal(saved[0].instagramBusinessAccountId, "ig_biz_123");
    assert.equal(saved[0].handle, "my_instagram");
    assert.equal(saved[0].capabilities.length, 2);
    assert.ok(saved[0].capabilities.includes("dm.read"));
  });
});
