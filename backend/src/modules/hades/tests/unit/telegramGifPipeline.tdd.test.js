import { describe, test } from "node:test";
import assert from "node:assert/strict";

async function load(mod, label) {
  try { return await import(mod); }
  catch (e) {
    if (e?.code !== "ERR_MODULE_NOT_FOUND") throw e;
    throw new Error(`Missing ${label} at ${mod}`);
  }
}

describe("Telegram GIF pipeline TDD", () => {
  test("telegramClient.sendAnimation posts to Telegram Bot API sendAnimation endpoint", async () => {
    const { createTelegramClient } = await load("../../services/telegramClient.js", "telegramClient.js");
    let postedMethod, postedBody;

    const client = await createTelegramClient({
      botToken: "test:token",
      api: {
        async post(method, body) {
          postedMethod = method;
          postedBody = body;
          return { ok: true, result: { message_id: 42 } };
        },
      },
    });

    const result = await client.sendAnimation({
      chatId: "123",
      animation: "https://media.giphy.com/media/test/giphy.gif",
      caption: "Funny cat!",
      parseMode: "Markdown",
      replyToMessageId: 5,
    });

    assert.equal(postedMethod, "sendAnimation");
    assert.equal(postedBody.chat_id, "123");
    assert.equal(postedBody.animation, "https://media.giphy.com/media/test/giphy.gif");
    assert.equal(postedBody.caption, "Funny cat!");
    assert.equal(postedBody.parse_mode, "Markdown");
    assert.equal(postedBody.reply_to_message_id, 5);
    assert.equal(result.providerMessageId, 42);
  });

  test("telegram bot runtime sends GIF animation when outbound action is send_gif", async () => {
    const { createTelegramBotRuntime } = await load("../../services/telegramBotRuntime.service.js", "telegramBotRuntime.service.js");

    const messages = [];
    const animations = [];

    const runtime = createTelegramBotRuntime({
      telegramClient: {
        sendMessage: async (opts) => { messages.push(opts); return { providerMessageId: 1 }; },
        sendAnimation: async (opts) => { animations.push(opts); return { providerMessageId: 2 }; },
      },
      resolveTelegramIdentity: async () => ({ userId: "user-a", tenantId: "tenant-a" }),
      hermesRuntime: {
        async generateCommandResult() {
          return {
            assistantText: "Here is a cat!",
            outboundActions: [{ type: "send_gif", query: "funny cat", searchQuery: "funny cat" }],
          };
        },
      },
      gifProvider: {
        searchGif: async () => ({ url: "https://media.giphy.com/media/cat/giphy.gif" }),
      },
    });

    const result = await runtime.handleTelegramUpdate({
      update: { message: { text: "hades send cat gif", chat: { id: "123" }, message_id: 5, from: { id: "tg-user" } } },
    });

    assert.equal(result.status, "sent");
    assert.equal(animations.length, 1);
    assert.equal(animations[0].chatId, "123");
    assert.equal(animations[0].animation, "https://media.giphy.com/media/cat/giphy.gif");
    assert.equal(animations[0].caption, "Here is a cat!");
    assert.equal(messages.length, 0);
  });

  test("telegram bot runtime falls back to sendMessage when gifProvider is not configured", async () => {
    const { createTelegramBotRuntime } = await load("../../services/telegramBotRuntime.service.js", "telegramBotRuntime.service.js");

    const messages = [];
    const animations = [];

    const runtime = createTelegramBotRuntime({
      telegramClient: {
        sendMessage: async (opts) => { messages.push(opts); return { providerMessageId: 1 }; },
        sendAnimation: async (opts) => { animations.push(opts); return { providerMessageId: 2 }; },
      },
      resolveTelegramIdentity: async () => ({ userId: "user-a", tenantId: "tenant-a" }),
      hermesRuntime: {
        async generateCommandResult() {
          return { assistantText: "Hello!", outboundActions: [] };
        },
      },
    });

    const result = await runtime.handleTelegramUpdate({
      update: { message: { text: "hades hello", chat: { id: "123" }, message_id: 5, from: { id: "tg-user" } } },
    });

    assert.equal(result.status, "sent");
    assert.equal(messages.length, 1);
    assert.equal(animations.length, 0);
  });
});
