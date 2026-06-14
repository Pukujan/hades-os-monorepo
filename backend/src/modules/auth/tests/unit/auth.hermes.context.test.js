import { test } from "node:test";
import assert from "node:assert/strict";

import { createHermesJobFromRequest } from "../../../auth/services/createHermesJobFromRequest.js";

function createSession() {
  return {
    userId: "user_123",
    tenantId: "user_123",
    email: "user@example.com",
    provider: "discord",
    discordAccountId: "discord_456",
    role: "authenticated"
  };
}

test("rejects Hermes job creation when no authenticated Supabase session is present", async () => {
  let verifyCalls = 0;
  let createCalls = 0;

  const result = await createHermesJobFromRequest({
    headers: {},
    body: {
      prompt: "Create a Discord cat meme minion"
    },
    verifySupabaseSession: async () => {
      verifyCalls += 1;
      return null;
    },
    createHermesJob: async () => {
      createCalls += 1;
      return { id: "should-not-run" };
    }
  });

  assert.equal(result.status, 401);
  assert.deepEqual(result.body, {
    error: "UNAUTHENTICATED"
  });
  assert.equal(verifyCalls, 1);
  assert.equal(createCalls, 0);
});

test("creates a Hermes job only after backend verifies a valid Supabase-authenticated Discord user", async () => {
  const verifiedSession = createSession();
  const received = [];

  const result = await createHermesJobFromRequest({
    headers: {
      authorization: "Bearer valid-supabase-jwt"
    },
    body: {
      prompt: "I want a command to send cat memes in Discord"
    },
    verifySupabaseSession: async (headers) => {
      assert.deepEqual(headers, {
        authorization: "Bearer valid-supabase-jwt"
      });
      return verifiedSession;
    },
    createHermesJob: async (context) => {
      received.push(context);
      return {
        id: "hermes_job_789",
        status: "queued"
      };
    }
  });

  assert.equal(result.status, 202);
  assert.deepEqual(result.body, {
    id: "hermes_job_789",
    status: "queued"
  });
  assert.equal(received.length, 1);
  assert.deepEqual(received[0], {
    userId: "user_123",
    tenantId: "user_123",
    discordAccountId: "discord_456",
    authProvider: "discord",
    input: {
      prompt: "I want a command to send cat memes in Discord"
    }
  });
});

test("does not allow client-supplied userId, tenantId, or discordAccountId to override backend-verified identity", async () => {
  const verifiedSession = {
    userId: "real_user_123",
    tenantId: "real_user_123",
    email: "real@example.com",
    provider: "discord",
    discordAccountId: "real_discord_456",
    role: "authenticated"
  };

  let receivedContext = null;

  const result = await createHermesJobFromRequest({
    headers: {
      authorization: "Bearer valid-supabase-jwt"
    },
    body: {
      prompt: "Create a Discord cat meme minion",
      userId: "attacker_user",
      tenantId: "attacker_tenant",
      discordAccountId: "attacker_discord"
    },
    verifySupabaseSession: async () => verifiedSession,
    createHermesJob: async (context) => {
      receivedContext = context;
      return {
        id: "hermes_job_safe",
        status: "queued"
      };
    }
  });

  assert.equal(result.status, 202);
  assert.deepEqual(receivedContext, {
    userId: "real_user_123",
    tenantId: "real_user_123",
    discordAccountId: "real_discord_456",
    authProvider: "discord",
    input: {
      prompt: "Create a Discord cat meme minion"
    }
  });
  assert.equal(JSON.stringify(receivedContext).includes("attacker_user"), false);
  assert.equal(JSON.stringify(receivedContext).includes("attacker_tenant"), false);
  assert.equal(JSON.stringify(receivedContext).includes("attacker_discord"), false);
});

test("Supabase verification errors fail closed", async () => {
  let createCalls = 0;

  const result = await createHermesJobFromRequest({
    headers: {
      authorization: "Bearer broken-token"
    },
    body: {
      prompt: "Create a Discord cat meme minion"
    },
    verifySupabaseSession: async () => {
      throw new Error("verification failed");
    },
    createHermesJob: async () => {
      createCalls += 1;
      return { id: "should-not-run" };
    }
  });

  assert.equal(result.status, 401);
  assert.deepEqual(result.body, {
    error: "UNAUTHENTICATED"
  });
  assert.equal(createCalls, 0);
});

test("raw Supabase tokens or cookies are never passed to Hermes", async () => {
  let receivedContext = null;

  const result = await createHermesJobFromRequest({
    headers: {
      authorization: "Bearer valid-supabase-jwt",
      cookie: "sb-access-token=secret; sb-refresh-token=secret"
    },
    body: {
      prompt: "I want a command to send cat memes in Discord"
    },
    verifySupabaseSession: async () => createSession(),
    createHermesJob: async (context) => {
      receivedContext = context;
      return {
        id: "hermes_job_999",
        status: "queued"
      };
    }
  });

  assert.equal(result.status, 202);
  assert.ok(receivedContext);
  assert.deepEqual(Object.keys(receivedContext).sort(), [
    "authProvider",
    "discordAccountId",
    "input",
    "tenantId",
    "userId"
  ]);
  assert.equal(JSON.stringify(receivedContext).includes("Bearer valid-supabase-jwt"), false);
  assert.equal(JSON.stringify(receivedContext).includes("sb-access-token"), false);
  assert.equal(JSON.stringify(receivedContext).includes("sb-refresh-token"), false);
});
