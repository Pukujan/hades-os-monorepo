import { test, describe } from "node:test";
import assert from "node:assert/strict";

async function loadTelegramClient() {
  try {
    return await import("../../services/telegramClient.js");
  } catch (error) {
    throw new Error(
      [
        "Missing Telegram client.",
        "Implement backend/src/modules/hades/services/telegramClient.js",
        "and export { createTelegramClient }.",
      ].join(" "),
      { cause: error }
    );
  }
}

describe("Telegram client", () => {
  test("sendMessage posts to Telegram Bot API with correct chat_id and text", async () => {
    const { createTelegramClient } = await loadTelegramClient();

    const requests = [];
    const client = await createTelegramClient({
      botToken: "test-telegram-token",
      api: {
        post: async (url, body) => {
          requests.push({ url, body });
          return { ok: true, result: { message_id: 42 } };
        },
      },
    });

    const result = await client.sendMessage({
      chatId: "chat_123",
      text: "Hello from Hades",
    });

    assert.equal(requests.length, 1);
    assert.ok(requests[0].url.includes("sendMessage"), "URL should hit sendMessage endpoint");
    assert.equal(requests[0].body.chat_id, "chat_123");
    assert.equal(requests[0].body.text, "Hello from Hades");
    assert.equal(result.providerMessageId, 42);
  });

  test("sendMessage supports Markdown parse_mode", async () => {
    const { createTelegramClient } = await loadTelegramClient();

    const requests = [];
    const client = await createTelegramClient({
      botToken: "test-telegram-token",
      api: {
        post: async (url, body) => {
          requests.push(body);
          return { ok: true, result: { message_id: 1 } };
        },
      },
    });

    await client.sendMessage({
      chatId: "chat_123",
      text: "*bold* and _italic_",
      parseMode: "MarkdownV2",
    });

    assert.equal(requests[0].parse_mode, "MarkdownV2");
  });

  test("sendMessage includes reply_to_message_id when provided", async () => {
    const { createTelegramClient } = await loadTelegramClient();

    const requests = [];
    const client = await createTelegramClient({
      botToken: "test-telegram-token",
      api: {
        post: async (url, body) => {
          requests.push(body);
          return { ok: true, result: { message_id: 1 } };
        },
      },
    });

    await client.sendMessage({
      chatId: "chat_123",
      text: "Reply",
      replyToMessageId: 99,
    });

    assert.equal(requests[0].reply_to_message_id, 99);
  });

  test("fails closed when bot token is empty", async () => {
    const { createTelegramClient } = await loadTelegramClient();

    await assert.rejects(
      () => createTelegramClient({ botToken: "" }),
      /bot token|not configured|invalid|telegram/i
    );
  });

  test("sendMessage rejects on Telegram API error", async () => {
    const { createTelegramClient } = await loadTelegramClient();

    const client = await createTelegramClient({
      botToken: "test-telegram-token",
      api: {
        post: async () => ({ ok: false, error_code: 429, description: "Too Many Requests" }),
      },
    });

    await assert.rejects(
      () => client.sendMessage({ chatId: "chat_123", text: "test" }),
      /429|too many requests|telegram/i
    );
  });

  test("setWebhook registers a webhook URL with Telegram", async () => {
    const { createTelegramClient } = await loadTelegramClient();

    const requests = [];
    const client = await createTelegramClient({
      botToken: "test-telegram-token",
      api: {
        post: async (url, body) => {
          requests.push({ url, body });
          return { ok: true, result: true };
        },
      },
    });

    const result = await client.setWebhook({
      url: "https://hades.example.com/api/hades/triggers/telegram",
    });

    assert.equal(requests.length, 1);
    assert.ok(requests[0].url.includes("setWebhook"), "URL should hit setWebhook endpoint");
    assert.equal(requests[0].body.url, "https://hades.example.com/api/hades/triggers/telegram");
    assert.equal(result, true);
  });

  test("getUpdates fetches pending updates with optional offset and timeout", async () => {
    const { createTelegramClient } = await loadTelegramClient();

    const requests = [];
    const client = await createTelegramClient({
      botToken: "test-telegram-token",
      api: {
        post: async (url, body) => {
          requests.push({ url, body });
          return { ok: true, result: [{ update_id: 1, message: { text: "hello" } }] };
        },
      },
    });

    const updates = await client.getUpdates({ offset: 0, timeout: 30, limit: 10 });

    assert.equal(requests.length, 1);
    assert.ok(requests[0].url.includes("getUpdates"), "URL should hit getUpdates endpoint");
    assert.equal(requests[0].body.offset, 0);
    assert.equal(requests[0].body.timeout, 30);
    assert.equal(requests[0].body.limit, 10);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].update_id, 1);
  });

  test("getUpdates returns empty array when no updates", async () => {
    const { createTelegramClient } = await loadTelegramClient();

    const client = await createTelegramClient({
      botToken: "test-telegram-token",
      api: {
        post: async () => ({ ok: true, result: [] }),
      },
    });

    const updates = await client.getUpdates();
    assert.deepEqual(updates, []);
  });

  test("getUpdates rejects on Telegram API error", async () => {
    const { createTelegramClient } = await loadTelegramClient();

    const client = await createTelegramClient({
      botToken: "test-telegram-token",
      api: {
        post: async () => ({ ok: false, error_code: 409, description: "Conflict: webhook is active" }),
      },
    });

    await assert.rejects(
      () => client.getUpdates(),
      /409|conflict|webhook|telegram/i
    );
  });
});
