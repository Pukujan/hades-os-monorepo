import { test } from "node:test";
import assert from "node:assert/strict";

async function loadRuntimeFactory() {
  try {
    return await import("../../services/discordBotRuntime.service.js");
  } catch (error) {
    throw new Error(
      [
        "Missing Discord bot runtime.",
        "Implement backend/src/modules/hades/services/discordBotRuntime.service.js",
        "and export createDiscordBotRuntime."
      ].join(" "),
      { cause: error }
    );
  }
}

function createVerifiedSession() {
  return {
    userId: "user_123",
    tenantId: "tenant_personal_user_123",
    provider: "discord",
    discordAccountId: "discord_456",
    role: "authenticated"
  };
}

test("Discord bot runtime uses a server-side bot token and resolves a verified Hades identity before Hermes", async () => {
  const { createDiscordBotRuntime } = await loadRuntimeFactory();
  assert.equal(typeof createDiscordBotRuntime, "function");

  const botTokens = [];
  const hermesRequests = [];
  const sends = [];
  const savedExecutions = [];

  const runtime = createDiscordBotRuntime({
    botTokenProvider: async () => "server-side-bot-secret",
    resolveDiscordIdentity: async ({ discordAccountId }) => {
      assert.equal(discordAccountId, "discord_456");
      return createVerifiedSession();
    },
    createDiscordClient: async ({ botToken }) => {
      botTokens.push(botToken);
      return {
        async sendMessage(request) {
          sends.push(request);
          return {
            providerMessageId: "discord-message-1"
          };
        }
      };
    },
    hermesRuntime: {
      async generateCommandResult(request) {
        hermesRequests.push(request);
        return {
          assistantText: "Sending cat memes from the bot runtime.",
          sessionId: "hermes-session-1",
          commandSpec: {
            name: "!sendcat",
            targetSocial: "discord",
            category: "fun",
            action: "send cat memes with a search term"
          },
          outboundActions: [
            {
              type: "send_message",
              content: "Sending cat memes from the bot runtime."
            }
          ],
          missingFields: [],
          safety: {
            allowed: true
          }
        };
      }
    },
    repository: {
      async saveAgentExecution({ execution }) {
        savedExecutions.push(execution);
        return { id: "agentexec_1", ...execution };
      }
    }
  });

  const result = await runtime.handleDiscordMessage({
    discordAccountId: "discord_456",
    channelId: "channel_abc",
    messageId: "discord-input-1",
    content: "!sendcat supercat"
  });

  assert.equal(result.status, "sent");
  assert.equal(result.sessionId, "hermes-session-1");
  assert.deepEqual(botTokens, ["server-side-bot-secret"]);
  assert.equal(hermesRequests.length, 1);
  assert.equal(hermesRequests[0].context.userId, "user_123");
  assert.equal(hermesRequests[0].context.tenantId, "tenant_personal_user_123");
  assert.equal(hermesRequests[0].context.discordAccountId, "discord_456");
  assert.equal(hermesRequests[0].input.content, "!sendcat supercat");
  assert.equal(sends.length, 1);
  assert.equal(sends[0].channelId, "channel_abc");
  assert.equal(sends[0].content, "Sending cat memes from the bot runtime.");
  assert.equal(savedExecutions.length, 1);
  assert.equal(savedExecutions[0].sessionId, "hermes-session-1");
  assert.equal(savedExecutions[0].discordAccountId, "discord_456");
});

test("Discord bot runtime fails closed when the bot token is unavailable", async () => {
  const { createDiscordBotRuntime } = await loadRuntimeFactory();
  let clientCalls = 0;
  let hermesCalls = 0;

  const runtime = createDiscordBotRuntime({
    botTokenProvider: async () => "",
    resolveDiscordIdentity: async () => createVerifiedSession(),
    createDiscordClient: async () => {
      clientCalls += 1;
      return {
        async sendMessage() {}
      };
    },
    hermesRuntime: {
      async generateCommandResult() {
        hermesCalls += 1;
        return {};
      }
    },
    repository: {
      async saveAgentExecution() {}
    }
  });

  await assert.rejects(
    () =>
      runtime.handleDiscordMessage({
        discordAccountId: "discord_456",
        channelId: "channel_abc",
        messageId: "discord-input-2",
        content: "!sendcat lawyer cat"
      }),
    /bot token|discord bot/i
  );

  assert.equal(clientCalls, 0);
  assert.equal(hermesCalls, 0);
});

test("Discord bot runtime normalizes slash social commands before Hermes", async () => {
  const { createDiscordBotRuntime } = await loadRuntimeFactory();
  const hermesRequests = [];
  const savedExecutions = [];

  const runtime = createDiscordBotRuntime({
    botTokenProvider: async () => "server-side-bot-secret",
    resolveDiscordIdentity: async () => createVerifiedSession(),
    createDiscordClient: async () => ({ sendMessage: async () => ({ providerMessageId: "discord-message-2" }) }),
    hermesRuntime: {
      async generateCommandResult(request) {
        hermesRequests.push(request);
        return {
          assistantText: "Sending.",
          sessionId: "hermes-session-2",
          commandSpec: {},
          outboundActions: [{ type: "send_message", content: "Sending." }],
          missingFields: [],
          safety: { allowed: true }
        };
      }
    },
    repository: {
      async saveAgentExecution({ execution }) {
        savedExecutions.push(execution);
      }
    }
  });

  await runtime.handleDiscordMessage({
    discordAccountId: "discord_456",
    channelId: "channel_abc",
    messageId: "discord-input-3",
    content: "/sendcat lawyer cat"
  });

  assert.equal(hermesRequests[0].input.commandName, "!sendcat");
  assert.equal(savedExecutions[0].commandName, "!sendcat");
});
