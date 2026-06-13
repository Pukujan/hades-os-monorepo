import assert from "node:assert/strict";
import { test } from "node:test";

async function loadBridgeFactory() {
  try {
    return await import("../../services/createDiscordBotConnectionFromRequest.js");
  } catch (error) {
    throw new Error(
      [
        "Missing Discord bot connection bridge.",
        "Implement backend/src/modules/auth/services/createDiscordBotConnectionFromRequest.js",
        "and export createDiscordBotConnectionFromRequest."
      ].join(" "),
      { cause: error }
    );
  }
}

function createVerifiedSession() {
  return {
    userId: "user_123",
    tenantId: "tenant_personal_user_123",
    email: "user@example.com",
    provider: "discord",
    discordAccountId: "discord_456",
    role: "authenticated"
  };
}

test("Discord OAuth login can link a backend-verified Discord identity without exposing the bot token", async () => {
  const { createDiscordBotConnectionFromRequest } = await loadBridgeFactory();
  assert.equal(typeof createDiscordBotConnectionFromRequest, "function");

  const botTokens = [];
  const savedConnections = [];
  const verifiedSession = createVerifiedSession();

  const result = await createDiscordBotConnectionFromRequest({
    headers: {
      authorization: "Bearer valid-supabase-jwt"
    },
    body: {
      discordAccountId: "attacker_discord",
      botToken: "client-side-bot-token",
      accessToken: "client-side-discord-access-token"
    },
    verifySupabaseSession: async (headers) => {
      assert.deepEqual(headers, {
        authorization: "Bearer valid-supabase-jwt"
      });
      return verifiedSession;
    },
    getDiscordBotToken: async () => "server-side-bot-secret",
    createDiscordBotClient: async ({ botToken }) => {
      botTokens.push(botToken);
      return {
        async inspectConnection() {
          return {
            botUserId: "bot_789",
            status: "ready"
          };
        }
      };
    },
    saveDiscordConnection: async ({ connection }) => {
      savedConnections.push(connection);
      return { id: "discord_connection_1", ...connection };
    }
  });

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    connected: true,
    provider: "discord",
    userId: "user_123",
    tenantId: "tenant_personal_user_123",
    discordAccountId: "discord_456",
    botConnected: true,
    botUserId: "bot_789"
  });
  assert.deepEqual(botTokens, ["server-side-bot-secret"]);
  assert.equal(savedConnections.length, 1);
  assert.equal(savedConnections[0].discordAccountId, "discord_456");
  assert.equal(JSON.stringify(savedConnections[0]).includes("client-side-bot-token"), false);
  assert.equal(JSON.stringify(savedConnections[0]).includes("client-side-discord-access-token"), false);
});

test("unauthenticated Discord connection requests fail closed before bot initialization", async () => {
  const { createDiscordBotConnectionFromRequest } = await loadBridgeFactory();
  let botTokenCalls = 0;
  let clientCalls = 0;
  let saveCalls = 0;

  const result = await createDiscordBotConnectionFromRequest({
    headers: {},
    body: {
      discordAccountId: "discord_456"
    },
    verifySupabaseSession: async () => null,
    getDiscordBotToken: async () => {
      botTokenCalls += 1;
      return "server-side-bot-secret";
    },
    createDiscordBotClient: async () => {
      clientCalls += 1;
      return {
        async inspectConnection() {
          return { botUserId: "bot_789", status: "ready" };
        }
      };
    },
    saveDiscordConnection: async () => {
      saveCalls += 1;
      return { id: "discord_connection_2" };
    }
  });

  assert.equal(result.status, 401);
  assert.deepEqual(result.body, { error: "UNAUTHENTICATED" });
  assert.equal(botTokenCalls, 0);
  assert.equal(clientCalls, 0);
  assert.equal(saveCalls, 0);
});

