import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createTelegramClient } from "../services/telegramClient.js";

const TEST_BOT_TOKEN = "8881519981:AAGvjB8ZsvBurrL2CXwrLCdscYhRU7yO6WQ";
const TEST_USER_ID = "7749441686";

describe("live Telegram E2E", { timeout: 15000 }, () => {
  test("getMe validates the bot token", async () => {
    const client = await createTelegramClient({ botToken: TEST_BOT_TOKEN });
    const botInfo = await client.getMe();
    assert.ok(botInfo?.id, "bot should have an id");
    assert.equal(botInfo.is_bot, true);
    console.log("Bot info:", botInfo.username, botInfo.id);
  });

  test("sendMessage delivers a message to the user", async () => {
    const client = await createTelegramClient({ botToken: TEST_BOT_TOKEN });
    const result = await client.sendMessage({
      chatId: TEST_USER_ID,
      text: "Hello from Hades E2E test! Token save & UUID fix confirmed working.",
    });
    assert.ok(result?.providerMessageId, "message should have an id");
    console.log("Sent message id:", result.providerMessageId);
  });
});
