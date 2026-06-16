import { test, describe } from "node:test";
import assert from "node:assert/strict";

async function loadRuntime() {
  try {
    return await import("../../services/telegramBotRuntime.service.js");
  } catch (error) {
    throw new Error(
      [
        "Missing Telegram bot runtime.",
        "Implement backend/src/modules/hades/services/telegramBotRuntime.service.js",
        "and export { createTelegramBotRuntime }.",
      ].join(" "),
      { cause: error }
    );
  }
}

function makeTelegramUpdate({ updateId = 1, messageId = 100, chatId = "chat_1", text = "hello", fromId = 12345, fromUsername = "testuser" } = {}) {
  return {
    update_id: updateId,
    message: {
      message_id: messageId,
      chat: { id: chatId, type: "private" },
      from: { id: fromId, is_bot: false, first_name: "Test", username: fromUsername },
      text,
      date: Math.floor(Date.now() / 1000),
    },
  };
}

describe("Telegram bot runtime", () => {
  test("handleTelegramUpdate routes a !hades command through Hermes and replies", async () => {
    const { createTelegramBotRuntime } = await loadRuntime();

    const sentMessages = [];
    const runtime = createTelegramBotRuntime({
      telegramClient: {
        sendMessage: async ({ chatId, text, parseMode, replyToMessageId }) => {
          sentMessages.push({ chatId, text, parseMode, replyToMessageId });
          return { providerMessageId: 200 };
        },
      },
      resolveTelegramIdentity: async ({ telegramAccountId }) => {
        return { userId: "user_1", tenantId: "tenant_1" };
      },
      hermesRuntime: {
        generateCommandResult: async (request) => {
          return {
            assistantText: "I found 3 todos due today.",
            commandSpec: {},
            outboundActions: [{ type: "send_message", content: "I found 3 todos due today." }],
            missingFields: [],
            safety: { allowed: true },
          };
        },
      },
      botTokenProvider: async () => "test-telegram-token",
    });

    const update = makeTelegramUpdate({ text: "!hades list my todos" });
    const result = await runtime.handleTelegramUpdate({ update });

    assert.equal(result.status, "sent");
    assert.equal(sentMessages.length, 1);
    assert.equal(sentMessages[0].chatId, "chat_1");
    assert.ok(sentMessages[0].text.includes("I found 3 todos due today."));
    assert.equal(sentMessages[0].replyToMessageId, 100);
  });

  test("handleTelegramUpdate returns ignored for non-hades messages", async () => {
    const { createTelegramBotRuntime } = await loadRuntime();

    let identityCalled = false;
    const runtime = createTelegramBotRuntime({
      telegramClient: { sendMessage: async () => ({ providerMessageId: 0 }) },
      resolveTelegramIdentity: async () => {
        identityCalled = true;
        return { userId: "user_1", tenantId: "tenant_1" };
      },
      hermesRuntime: { generateCommandResult: async () => ({}) },
      botTokenProvider: async () => "token",
    });

    const update = makeTelegramUpdate({ text: "hello there" });
    const result = await runtime.handleTelegramUpdate({ update });

    assert.equal(result.status, "ignored");
    assert.equal(identityCalled, false);
    assert.equal(result.reason, "not_a_hades_command");
  });

  test("handleTelegramUpdate throws when Telegram identity is not connected", async () => {
    const { createTelegramBotRuntime } = await loadRuntime();

    const runtime = createTelegramBotRuntime({
      telegramClient: { sendMessage: async () => ({ providerMessageId: 0 }) },
      resolveTelegramIdentity: async () => null,
      hermesRuntime: { generateCommandResult: async () => ({}) },
      botTokenProvider: async () => "token",
    });

    const update = makeTelegramUpdate({ text: "!hades status" });
    await assert.rejects(
      () => runtime.handleTelegramUpdate({ update }),
      /Telegram identity|not connected|authenticated/i
    );
  });

  test("handleTelegramUpdate passes hadesCommandParser result to Hermes context", async () => {
    const { createTelegramBotRuntime } = await loadRuntime();

    let hermesRequest = null;
    const runtime = createTelegramBotRuntime({
      telegramClient: { sendMessage: async () => ({ providerMessageId: 0 }) },
      resolveTelegramIdentity: async () => ({ userId: "user_1", tenantId: "tenant_1" }),
      hermesRuntime: {
        generateCommandResult: async (request) => {
          hermesRequest = request;
          return {
            assistantText: "Summary done.",
            commandSpec: {},
            outboundActions: [{ type: "send_message", content: "Summary done." }],
            missingFields: [],
            safety: { allowed: true },
          };
        },
      },
      botTokenProvider: async () => "token",
    });

    const update = makeTelegramUpdate({ text: "!hades summarize chat 5" });
    await runtime.handleTelegramUpdate({ update });

    assert.notEqual(hermesRequest, null);
    assert.equal(hermesRequest.input.content, "!hades summarize chat 5");
    assert.equal(hermesRequest.input.parsedCommand.action, "summarize");
    assert.equal(hermesRequest.input.parsedCommand.source, "chat");
    assert.equal(hermesRequest.input.parsedCommand.count, 5);
    assert.equal(hermesRequest.context.provider, "telegram");
  });

  test("handleTelegramUpdate saves agent execution when repository is provided", async () => {
    const { createTelegramBotRuntime } = await loadRuntime();

    let savedExecution = null;
    const runtime = createTelegramBotRuntime({
      telegramClient: { sendMessage: async () => ({ providerMessageId: 200 }) },
      resolveTelegramIdentity: async () => ({ userId: "user_1", tenantId: "tenant_1" }),
      hermesRuntime: {
        generateCommandResult: async () => ({
          assistantText: "Done.",
          commandSpec: {},
          outboundActions: [],
          missingFields: [],
          safety: { allowed: true },
        }),
      },
      botTokenProvider: async () => "token",
      repository: {
        saveAgentExecution: async ({ execution }) => {
          savedExecution = execution;
        },
      },
    });

    const update = makeTelegramUpdate({ text: "!hades status" });
    const result = await runtime.handleTelegramUpdate({ update });

    assert.equal(result.status, "sent");
    assert.notEqual(savedExecution, null);
    assert.equal(savedExecution.provider, "telegram");
    assert.equal(savedExecution.userId, "user_1");
  });

  test("handleTelegramUpdate handles /hades alias", async () => {
    const { createTelegramBotRuntime } = await loadRuntime();

    const sentMessages = [];
    const runtime = createTelegramBotRuntime({
      telegramClient: {
        sendMessage: async ({ chatId, text }) => {
          sentMessages.push({ chatId, text });
          return { providerMessageId: 200 };
        },
      },
      resolveTelegramIdentity: async () => ({ userId: "user_1", tenantId: "tenant_1" }),
      hermesRuntime: {
        generateCommandResult: async () => ({
          assistantText: "Status: all systems operational.",
          commandSpec: {},
          outboundActions: [{ type: "send_message", content: "Status: all systems operational." }],
          missingFields: [],
          safety: { allowed: true },
        }),
      },
      botTokenProvider: async () => "token",
    });

    const update = makeTelegramUpdate({ text: "/hades status" });
    const result = await runtime.handleTelegramUpdate({ update });

    assert.equal(result.status, "sent");
    assert.equal(sentMessages.length, 1);
    assert.ok(sentMessages[0].text.includes("Status"));
  });
});
