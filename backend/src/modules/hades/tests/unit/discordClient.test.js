import { test, describe } from "node:test";
import assert from "node:assert/strict";

async function loadDiscordClient() {
  try {
    return await import("../../services/discordClient.js");
  } catch (error) {
    throw new Error(
      [
        "Missing Discord client.",
        "Implement backend/src/modules/hades/services/discordClient.js",
        "and export { createDiscordClient }.",
      ].join(" "),
      { cause: error }
    );
  }
}

describe("Discord client", () => {
  test("sendMessage sends to the correct channel with content", async () => {
    const { createDiscordClient } = await loadDiscordClient();
    assert.equal(typeof createDiscordClient, "function");

    const sent = [];
    const client = await createDiscordClient({
      botToken: "test-bot-token",
      rest: {
        post: async (url, body) => {
          sent.push({ url, body });
          return { id: "discord-msg-1" };
        },
      },
    });

    const result = await client.sendMessage({
      channelId: "channel_abc",
      content: "Hello from test",
      replyToMessageId: "msg_1",
    });

    assert.equal(sent.length, 1);
    assert.ok(sent[0].url.includes("channel_abc"), "URL should contain channel ID");
    assert.equal(sent[0].body.content, "Hello from test");
    assert.equal(result.providerMessageId, "discord-msg-1");
  });

  test("sendMessage includes GIF URL when provided", async () => {
    const { createDiscordClient } = await loadDiscordClient();

    const sent = [];
    const client = await createDiscordClient({
      botToken: "test-bot-token",
      rest: {
        post: async (url, body) => {
          sent.push({ url, body });
          return { id: "discord-msg-2" };
        },
      },
    });

    await client.sendMessage({
      channelId: "channel_abc",
      content: "Here is a cat GIF",
      gifUrl: "https://media.giphy.com/cat.gif",
    });

    assert.equal(sent.length, 1);
    assert.ok(sent[0].body.embeds, "Should include embeds array");
    assert.equal(sent[0].body.embeds[0].image?.url, "https://media.giphy.com/cat.gif");
  });

  test("fails closed when bot token is empty", async () => {
    const { createDiscordClient } = await loadDiscordClient();

    await assert.rejects(
      () => createDiscordClient({ botToken: "" }),
      /bot token|not configured|invalid/i
    );
  });

  test("sendMessage fails closed on API error", async () => {
    const { createDiscordClient } = await loadDiscordClient();

    const client = await createDiscordClient({
      botToken: "test-bot-token",
      rest: {
        post: async () => {
          throw new Error("Discord API returned 429");
        },
      },
    });

    await assert.rejects(
      () => client.sendMessage({ channelId: "channel_abc", content: "test" }),
      /429|rate limit|Discord API/i
    );
  });

  test("sendMessage handles reply with message reference", async () => {
    const { createDiscordClient } = await loadDiscordClient();

    const sent = [];
    const client = await createDiscordClient({
      botToken: "test-bot-token",
      rest: {
        post: async (url, body) => {
          sent.push(body);
          return { id: "discord-msg-3" };
        },
      },
    });

    await client.sendMessage({
      channelId: "channel_abc",
      content: "Reply test",
      replyToMessageId: "parent_msg_1",
    });

    assert.equal(sent.length, 1);
    assert.ok(sent[0].message_reference, "Should include message_reference");
    assert.equal(sent[0].message_reference.message_id, "parent_msg_1");
  });
});
