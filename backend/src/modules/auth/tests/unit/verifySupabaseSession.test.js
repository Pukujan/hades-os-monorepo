import { test } from "node:test";
import assert from "node:assert/strict";
import { verifySupabaseSession } from "../../services/verifySupabaseSession.js";

test("verifySupabaseSession calls Supabase user endpoint with bearer token", async () => {
  let receivedUrl = null;
  let receivedHeaders = null;

  const session = await verifySupabaseSession(
    {
      authorization: "Bearer valid-supabase-jwt"
    },
    {
      supabaseUrl: "https://project.supabase.co",
      supabaseAnonKey: "anon-key",
      fetchImpl: async (url, options) => {
        receivedUrl = url;
        receivedHeaders = options.headers;
        return {
          ok: true,
          async json() {
            return {
              id: "user_123",
              email: "user@example.com",
              role: "authenticated",
              app_metadata: { provider: "discord" },
              identities: [
                {
                  provider: "discord",
                  provider_id: "discord_456",
                  identity_data: { sub: "discord_456" }
                }
              ]
            };
          }
        };
      }
    }
  );

  assert.equal(receivedUrl, "https://project.supabase.co/auth/v1/user");
  assert.deepEqual(receivedHeaders, {
    apikey: "anon-key",
    authorization: "Bearer valid-supabase-jwt",
    accept: "application/json"
  });
  assert.deepEqual(session, {
    userId: "user_123",
    tenantId: "tenant_user_123",
    email: "user@example.com",
    provider: "discord",
    discordAccountId: "discord_456",
    role: "authenticated"
  });
});

test("verifySupabaseSession accepts sb-access-token cookies", async () => {
  let calls = 0;
  const session = await verifySupabaseSession(
    {
      cookie: "other=value; sb-access-token=secret-token; sb-refresh-token=refresh-token"
    },
    {
      supabaseUrl: "https://project.supabase.co",
      supabaseAnonKey: "anon-key",
      fetchImpl: async (_url, options) => {
        calls += 1;
        assert.equal(options.headers.authorization, "Bearer secret-token");
        return {
          ok: true,
          async json() {
            return {
              id: "user_abc",
              email: "user@site.com",
              role: "authenticated",
              identities: []
            };
          }
        };
      }
    }
  );

  assert.equal(calls, 1);
  assert.deepEqual(session, {
    userId: "user_abc",
    tenantId: "tenant_user_abc",
    email: "user@site.com",
    provider: "discord",
    discordAccountId: null,
    role: "authenticated"
  });
});

test("verifySupabaseSession returns null when auth is missing or invalid", async () => {
  const noAuth = await verifySupabaseSession({}, { supabaseUrl: "https://project.supabase.co", supabaseAnonKey: "anon-key" });
  assert.equal(noAuth, null);

  const rejected = await verifySupabaseSession(
    { authorization: "Bearer bad-token" },
    {
      supabaseUrl: "https://project.supabase.co",
      supabaseAnonKey: "anon-key",
      fetchImpl: async () => ({ ok: false, async json() { return {}; } })
    }
  );
  assert.equal(rejected, null);
});
