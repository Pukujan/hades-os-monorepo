import { test } from "node:test";
import assert from "node:assert/strict";

async function loadRuntimeFactory() {
  try {
    return await import("../../services/telegramBotRuntime.service.js");
  } catch (error) {
    throw new Error(
      [
        "Missing Telegram bot runtime.",
        "Implement backend/src/modules/hades/services/telegramBotRuntime.service.js",
        "and export createTelegramBotRuntime."
      ].join(" "),
      { cause: error }
    );
  }
}

function makeUpdate({ text, chatId, messageId, fromId }) {
  return {
    message: {
      message_id: messageId || 1,
      from: { id: fromId || 999, is_bot: false, first_name: "Test" },
      chat: { id: chatId || -100123, type: "group" },
      text: text || "!hades test",
      date: Math.floor(Date.now() / 1000),
    }
  };
}

test("Telegram bot runtime replies with help text for non-!hades messages instead of silent ignore", async () => {
  const { createTelegramBotRuntime } = await loadRuntimeFactory();
  assert.equal(typeof createTelegramBotRuntime, "function");

  const sends = [];
  const hermesCalls = [];

  const runtime = createTelegramBotRuntime({
    telegramClient: {
      async sendMessage(request) {
        sends.push(request);
        return { providerMessageId: "tg-msg-1" };
      }
    },
    resolveTelegramIdentity: async ({ telegramAccountId }) => {
      return { userId: "user_123", tenantId: "tenant_123" };
    },
    hermesRuntime: {
      async generateCommandResult() {
        hermesCalls.push("called");
        return { assistantText: "Hello from Hermes!" };
      }
    },
    repository: {
      async saveAgentExecution() {}
    }
  });

  const result = await runtime.handleTelegramUpdate({
    update: makeUpdate({ text: "HI" })
  });

  assert.equal(result.status, "sent");
  assert.equal(hermesCalls.length, 0);
  assert.equal(sends.length, 1);
  assert.ok(sends[0].text.includes("hades"));
  assert.ok(sends[0].text.includes("HI"));
});

test("Telegram bot runtime routes !hades commands to Hermes and sends reply", async () => {
  const { createTelegramBotRuntime } = await loadRuntimeFactory();
  assert.equal(typeof createTelegramBotRuntime, "function");

  const sends = [];
  const hermesRequests = [];
  const savedExecutions = [];

  const runtime = createTelegramBotRuntime({
    telegramClient: {
      async sendMessage(request) {
        sends.push(request);
        return { providerMessageId: "tg-msg-2" };
      }
    },
    resolveTelegramIdentity: async ({ telegramAccountId }) => {
      assert.equal(telegramAccountId, "999");
      return { userId: "user_123", tenantId: "tenant_personal_user_123" };
    },
    hermesRuntime: {
      async generateCommandResult(request) {
        hermesRequests.push(request);
        return {
          assistantText: "Processing your request!",
          outboundActions: [
            { type: "send_message", content: "Extra content" }
          ]
        };
      }
    },
    repository: {
      async saveAgentExecution({ execution }) {
        savedExecutions.push(execution);
        return { id: "exec_1", ...execution };
      }
    }
  });

  const result = await runtime.handleTelegramUpdate({
    update: makeUpdate({ text: "!hades do something" })
  });

  assert.equal(result.status, "sent");
  assert.equal(result.providerMessageId, "tg-msg-2");
  assert.equal(hermesRequests.length, 1);
  assert.equal(hermesRequests[0].input.content, "!hades do something");
  assert.equal(hermesRequests[0].context.userId, "user_123");
  assert.equal(hermesRequests[0].context.tenantId, "tenant_personal_user_123");
  assert.equal(hermesRequests[0].context.provider, "telegram");
  assert.equal(sends.length, 1);
  assert.ok(sends[0].text.includes("Processing your request!"));
  assert.ok(sends[0].text.includes("Extra content"));
  assert.equal(savedExecutions.length, 1);
  assert.equal(savedExecutions[0].provider, "telegram");
});

test("Telegram bot runtime ignores updates without text", async () => {
  const { createTelegramBotRuntime } = await loadRuntimeFactory();

  const runtime = createTelegramBotRuntime({
    telegramClient: { async sendMessage() { return {}; } },
    resolveTelegramIdentity: async () => ({ userId: "u1", tenantId: "t1" }),
    hermesRuntime: { async generateCommandResult() { return {}; } },
  });

  const result = await runtime.handleTelegramUpdate({
    update: { message: { from: { id: 1 }, chat: { id: 1 } } }
  });

  assert.equal(result.status, "ignored");
  assert.equal(result.reason, "no_text");
});
