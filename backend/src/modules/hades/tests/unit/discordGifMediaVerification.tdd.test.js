import { describe, test } from "node:test";
import assert from "node:assert/strict";

const BAD_TENOR_URL = "https://media1.tenor.com/m/-DoRykX0LwcAAAAd/anime-girl-dark-hair.gif";

async function loadFlowFactory() {
  try {
    return await import("../../services/discordHermesCommandFlow.service.js");
  } catch (error) {
    throw new Error("Missing Discord Hermes command flow for media verification contract.", { cause: error });
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

function createHermesGifRuntime() {
  return {
    async generateCommandResult() {
      return {
        assistantText: "I found a GIF for you.",
        sessionId: "session-media-1",
        commandSpec: {
          name: "!gif",
          targetSocial: "discord",
          action: "send anime girl dark hair GIF"
        },
        outboundActions: [
          { type: "send_gif", query: "anime girl dark hair", rating: "pg-13" }
        ],
        missingFields: [],
        safety: { allowed: true }
      };
    }
  };
}

describe("Discord GIF media verification", () => {
  test("does not send an unavailable GIF URL when verifier rejects it", async () => {
    const { createDiscordHermesCommandFlow } = await loadFlowFactory();
    const discordSends = [];
    const savedDeliveries = [];

    const flow = createDiscordHermesCommandFlow({
      verifyDiscordAccount: async () => createVerifiedDiscordSession(),
      hermesRuntime: createHermesGifRuntime(),
      gifProvider: {
        async searchGif() {
          return {
            id: "bad-tenor",
            url: BAD_TENOR_URL,
            title: "Unavailable Tenor media"
          };
        }
      },
      mediaVerifier: {
        async verifyMediaUrl({ url }) {
          assert.equal(url, BAD_TENOR_URL);
          return {
            ok: false,
            url,
            reason: "content_unavailable"
          };
        }
      },
      discordClient: {
        async sendMessage(request) {
          discordSends.push(request);
          return { providerMessageId: "discord-message-no-embed" };
        }
      },
      repository: {
        async saveAgentExecution() {},
        async saveOutboundDelivery(delivery) {
          savedDeliveries.push(delivery);
        }
      }
    });

    await flow.handleDiscordCommand({
      discordAccountId: "discord_456",
      channelId: "channel_abc",
      messageId: "message_abc",
      content: "!gif anime girl dark hair"
    });

    assert.equal(discordSends.length, 1);
    assert.equal(discordSends[0].gifUrl, null);
    assert.match(discordSends[0].content, /gif|media|unavailable|verify/i);

    assert.equal(savedDeliveries.length, 1);
    assert.equal(savedDeliveries[0].gifUrl, null);
    assert.deepEqual(savedDeliveries[0].mediaVerification, {
      ok: false,
      url: BAD_TENOR_URL,
      reason: "content_unavailable"
    });
  });

  test("sends and records verified direct GIF media", async () => {
    const { createDiscordHermesCommandFlow } = await loadFlowFactory();
    const verifiedUrl = "https://media.example.com/cat.gif";
    const discordSends = [];
    const savedDeliveries = [];

    const flow = createDiscordHermesCommandFlow({
      verifyDiscordAccount: async () => createVerifiedDiscordSession(),
      hermesRuntime: createHermesGifRuntime(),
      gifProvider: {
        async searchGif() {
          return {
            id: "good-gif",
            url: verifiedUrl,
            title: "Verified cat"
          };
        }
      },
      mediaVerifier: {
        async verifyMediaUrl({ url, allowedContentTypes }) {
          assert.equal(url, verifiedUrl);
          assert.ok(allowedContentTypes.includes("image/gif"));
          return {
            ok: true,
            url,
            contentType: "image/gif"
          };
        }
      },
      discordClient: {
        async sendMessage(request) {
          discordSends.push(request);
          return { providerMessageId: "discord-message-with-embed" };
        }
      },
      repository: {
        async saveAgentExecution() {},
        async saveOutboundDelivery(delivery) {
          savedDeliveries.push(delivery);
        }
      }
    });

    await flow.handleDiscordCommand({
      discordAccountId: "discord_456",
      channelId: "channel_abc",
      messageId: "message_abc",
      content: "!gif cat"
    });

    assert.equal(discordSends[0].gifUrl, verifiedUrl);
    assert.equal(savedDeliveries[0].gifUrl, verifiedUrl);
    assert.deepEqual(savedDeliveries[0].mediaVerification, {
      ok: true,
      url: verifiedUrl,
      contentType: "image/gif"
    });
  });
});
