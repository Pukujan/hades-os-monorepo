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
          assert.equal(calls[0].url, "https://backend.composio.dev/api/v3.1/connected_accounts/link");
          assert.equal(calls[0].options.method, "POST");
          assert.equal(calls[0].options.headers["x-api-key"], "composio_api_key_123");
          assert.equal(calls[0].options.headers["Content-Type"], "application/json");

          const requestBody = JSON.parse(calls[0].options.body);
          assert.deepEqual(requestBody, {
            auth_config_id: "auth_config_instagram_123",
            user_id: "user_123",
            alias: "hades-tenant_123-instagram",
            callback_url: "https://hades.example/app/socials?provider=instagram",
          });

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
});
