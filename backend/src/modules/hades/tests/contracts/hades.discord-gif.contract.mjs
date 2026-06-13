import { test } from "node:test";
import assert from "node:assert/strict";

async function loadFlowFactory() {
  try {
    return await import("../../services/discordHermesCommandFlow.service.js");
  } catch (error) {
    throw new Error(
      [
        "Missing Discord Hermes command flow.",
        "Implement backend/src/modules/hades/services/discordHermesCommandFlow.service.js",
        "and export createDiscordHermesCommandFlow."
      ].join(" "),
      { cause: error }
    );
  }
}

function createVerifiedDiscordSession() {
  return {
    userId: "user_123",
    tenantId: "tenant_personal_user_123",
    provider: "discord",
    discordAccountId: "discord_456",
    role: "authenticated"
  };
}

test("authenticated Discord command calls Hermes, sends a GIF, and persists the execution", async () => {
  const { createDiscordHermesCommandFlow } = await loadFlowFactory();
  assert.equal(typeof createDiscordHermesCommandFlow, "function");

  const hermesRequests = [];
  const gifRequests = [];
  const discordSends = [];
  const savedExecutions = [];
  const savedDeliveries = [];

  const flow = createDiscordHermesCommandFlow({
    verifyDiscordAccount: async ({ discordAccountId }) => {
      assert.equal(discordAccountId, "discord_456");
      return createVerifiedDiscordSession();
    },
    hermesRuntime: {
      async generateCommandResult(request) {
        hermesRequests.push(request);
        return {
          assistantText: "Sending one biochemical cat meme GIF.",
          sessionId: "hermes-session-1",
          commandSpec: {
            name: "!catgif",
            targetSocial: "discord",
            category: "fun",
            action: "send a biochemical cat meme GIF"
          },
          outboundActions: [
            {
              type: "send_gif",
              provider: "giphy",
              query: "biochemical cat meme",
              channelId: "channel_abc"
            }
          ],
          missingFields: [],
          safety: {
            allowed: true
          }
        };
      }
    },
    gifProvider: {
      async searchGif(request) {
        gifRequests.push(request);
        return {
          id: "gif_1",
          url: "https://media.example/cat-biochem.gif",
          title: "Biochemical Cat Meme"
        };
      }
    },
    discordClient: {
      async sendMessage(request) {
        discordSends.push(request);
        return {
          providerMessageId: "discord-message-999"
        };
      }
    },
    repository: {
      async saveAgentExecution({ execution }) {
        savedExecutions.push(execution);
        return { id: "agentexec_1", ...execution };
      },
      async saveOutboundDelivery(delivery) {
        savedDeliveries.push(delivery);
        return { id: "delivery_1", ...delivery };
      }
    }
  });

  const result = await flow.handleDiscordCommand({
    discordAccountId: "discord_456",
    channelId: "channel_abc",
    messageId: "discord-input-1",
    content: "!catgif biochemical cat memes"
  });

  assert.equal(result.status, "sent");
  assert.equal(result.sessionId, "hermes-session-1");
  assert.equal(hermesRequests.length, 1);
  assert.equal(hermesRequests[0].context.userId, "user_123");
  assert.equal(hermesRequests[0].context.tenantId, "tenant_personal_user_123");
  assert.equal(hermesRequests[0].context.discordAccountId, "discord_456");
  assert.equal(hermesRequests[0].input.content, "!catgif biochemical cat memes");
  assert.ok(hermesRequests[0].responseSchema);
  assert.equal(JSON.stringify(hermesRequests[0]).includes("Bearer "), false);

  assert.equal(gifRequests.length, 1);
  assert.deepEqual(gifRequests[0], {
    query: "biochemical cat meme",
    rating: "pg-13",
    limit: 1,
    tenantId: "tenant_personal_user_123",
    userId: "user_123"
  });

  assert.equal(discordSends.length, 1);
  assert.deepEqual(discordSends[0], {
    channelId: "channel_abc",
    content: "Sending one biochemical cat meme GIF.",
    gifUrl: "https://media.example/cat-biochem.gif",
    replyToMessageId: "discord-input-1"
  });

  assert.equal(savedExecutions.length, 1);
  assert.equal(savedExecutions[0].sessionId, "hermes-session-1");
  assert.equal(savedExecutions[0].userId, "user_123");
  assert.equal(savedExecutions[0].tenantId, "tenant_personal_user_123");
  assert.equal(savedDeliveries.length, 1);
  assert.equal(savedDeliveries[0].providerMessageId, "discord-message-999");
});

test("unauthenticated Discord commands are rejected before Hermes, GIF, or Discord send", async () => {
  const { createDiscordHermesCommandFlow } = await loadFlowFactory();
  let hermesCalls = 0;
  let gifCalls = 0;
  let sendCalls = 0;

  const flow = createDiscordHermesCommandFlow({
    verifyDiscordAccount: async () => null,
    hermesRuntime: {
      async generateCommandResult() {
        hermesCalls += 1;
      }
    },
    gifProvider: {
      async searchGif() {
        gifCalls += 1;
      }
    },
    discordClient: {
      async sendMessage() {
        sendCalls += 1;
      }
    },
    repository: {
      async saveAgentExecution() {},
      async saveOutboundDelivery() {}
    }
  });

  await assert.rejects(
    () =>
      flow.handleDiscordCommand({
        discordAccountId: "unknown_discord",
        channelId: "channel_abc",
        messageId: "discord-input-2",
        content: "!catgif"
      }),
    /unauthenticated|not connected|discord/i
  );

  assert.equal(hermesCalls, 0);
  assert.equal(gifCalls, 0);
  assert.equal(sendCalls, 0);
});

test("Hermes command output is saved as a Hades minion, not as a Hermes skill", async () => {
  const { createDiscordHermesCommandFlow } = await loadFlowFactory();
  const savedMinions = [];
  const savedSkills = [];

  const flow = createDiscordHermesCommandFlow({
    verifyDiscordAccount: async () => createVerifiedDiscordSession(),
    hermesRuntime: {
      async generateCommandResult() {
        return {
          assistantText: "Command minion ready.",
          sessionId: "hermes-session-2",
          commandSpec: {
            name: "!catgif",
            targetSocial: "discord",
            category: "fun",
            action: "send a biochemical cat meme GIF"
          },
          outboundActions: [],
          missingFields: [],
          safety: {
            allowed: true
          }
        };
      }
    },
    gifProvider: {
      async searchGif() {
        throw new Error("GIF search should not run without outbound actions");
      }
    },
    discordClient: {
      async sendMessage() {
        return { providerMessageId: "discord-message-1000" };
      }
    },
    repository: {
      async saveAgentExecution() {
        return { id: "agentexec_2" };
      },
      async saveOutboundDelivery() {
        return { id: "delivery_2" };
      },
      async saveMinion({ minion }) {
        savedMinions.push(minion);
        return { id: "minion_1", ...minion };
      }
    },
    skillStore: {
      async saveSkill(skill) {
        savedSkills.push(skill);
      }
    }
  });

  const result = await flow.handleDiscordCommand({
    discordAccountId: "discord_456",
    channelId: "channel_abc",
    messageId: "discord-input-3",
    content: "!catgif create biochemical cat meme command"
  });

  assert.equal(result.status, "saved");
  assert.equal(savedMinions.length, 1);
  assert.equal(savedMinions[0].commandName, "!catgif");
  assert.equal(savedMinions[0].targetSocial, "discord");
  assert.equal(savedSkills.length, 0);
});

