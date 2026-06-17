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

  test("handleTelegramUpdate sends help reply for non-hades messages", async () => {
    const { createTelegramBotRuntime } = await loadRuntime();

    const sentMessages = [];
    const runtime = createTelegramBotRuntime({
      telegramClient: {
        sendMessage: async ({ chatId, text, replyToMessageId }) => {
          sentMessages.push({ chatId, text, replyToMessageId });
          return { providerMessageId: 0 };
        },
      },
      resolveTelegramIdentity: async () => {
        return { userId: "user_1", tenantId: "tenant_1" };
      },
      hermesRuntime: { generateCommandResult: async () => ({}) },
      botTokenProvider: async () => "token",
    });

    const update = makeTelegramUpdate({ text: "hello there", messageId: 55 });
    const result = await runtime.handleTelegramUpdate({ update });

    assert.equal(result.status, "sent");
    assert.equal(result.reason, "non_command_help");
    assert.equal(sentMessages.length, 1);
    assert.equal(sentMessages[0].chatId, "chat_1");
    assert.ok(sentMessages[0].text.includes("hades"));
    assert.equal(sentMessages[0].replyToMessageId, 55);
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

  test("handleTelegramUpdate accepts bare forge command", async () => {
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
          assistantText: "Minion created.",
          commandSpec: {},
          outboundActions: [{ type: "send_message", content: "Minion created." }],
          missingFields: [],
          safety: { allowed: true },
        }),
      },
      botTokenProvider: async () => "token",
    });

    const update = makeTelegramUpdate({ text: "forge create summarizer" });
    const result = await runtime.handleTelegramUpdate({ update });

    assert.equal(result.status, "sent");
    assert.equal(sentMessages.length, 1);
    assert.ok(sentMessages[0].text.includes("Minion created."));
  });

  test("handleTelegramUpdate accepts bare hades command", async () => {
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
          assistantText: "Found 3 todos.",
          commandSpec: {},
          outboundActions: [{ type: "send_message", content: "Found 3 todos." }],
          missingFields: [],
          safety: { allowed: true },
        }),
      },
      botTokenProvider: async () => "token",
    });

    const update = makeTelegramUpdate({ text: "hades list my todos" });
    const result = await runtime.handleTelegramUpdate({ update });

    assert.equal(result.status, "sent");
    assert.equal(sentMessages.length, 1);
    assert.ok(sentMessages[0].text.includes("Found 3 todos."));
  });

  test("handleTelegramUpdate standalone forge switches to forge mode", async () => {
    const { createTelegramBotRuntime } = await loadRuntime();

    const sentMessages = [];
    let setModeCalled = false;
    const runtime = createTelegramBotRuntime({
      telegramClient: {
        sendMessage: async ({ chatId, text }) => {
          sentMessages.push({ chatId, text });
          return { providerMessageId: 200 };
        },
      },
      resolveTelegramIdentity: async () => ({ userId: "user_1", tenantId: "tenant_1" }),
      hermesRuntime: { generateCommandResult: async () => ({}) },
      botTokenProvider: async () => "token",
      conversationModeRepo: {
        getMode: async () => "general",
        setMode: async ({ chatId, userId, tenantId, mode }) => {
          setModeCalled = true;
          assert.equal(mode, "forge");
        },
      },
    });

    const update = makeTelegramUpdate({ text: "forge" });
    const result = await runtime.handleTelegramUpdate({ update });

    assert.equal(result.status, "sent");
    assert.equal(result.reason, "mode_switch_forge");
    assert.equal(setModeCalled, true);
    assert.ok(sentMessages[0].text.includes("Forge"));
  });

  test("handleTelegramUpdate standalone hades switches to general mode", async () => {
    const { createTelegramBotRuntime } = await loadRuntime();

    const sentMessages = [];
    let setModeCalled = false;
    const runtime = createTelegramBotRuntime({
      telegramClient: {
        sendMessage: async ({ chatId, text }) => {
          sentMessages.push({ chatId, text });
          return { providerMessageId: 200 };
        },
      },
      resolveTelegramIdentity: async () => ({ userId: "user_1", tenantId: "tenant_1" }),
      hermesRuntime: { generateCommandResult: async () => ({}) },
      botTokenProvider: async () => "token",
      conversationModeRepo: {
        getMode: async () => "forge",
        setMode: async ({ chatId, userId, tenantId, mode }) => {
          setModeCalled = true;
          assert.equal(mode, "general");
        },
      },
    });

    const update = makeTelegramUpdate({ text: "hades" });
    const result = await runtime.handleTelegramUpdate({ update });

    assert.equal(result.status, "sent");
    assert.equal(result.reason, "mode_switch_general");
    assert.equal(setModeCalled, true);
    assert.ok(sentMessages[0].text.includes("General"));
  });

  test("handleTelegramUpdate processes forge mode messages as forge commands", async () => {
    const { createTelegramBotRuntime } = await loadRuntime();

    const sentMessages = [];
    let hermesRequest = null;
    const runtime = createTelegramBotRuntime({
      telegramClient: {
        sendMessage: async ({ chatId, text }) => {
          sentMessages.push({ chatId, text });
          return { providerMessageId: 200 };
        },
      },
      resolveTelegramIdentity: async () => ({ userId: "user_1", tenantId: "tenant_1" }),
      hermesRuntime: {
        generateCommandResult: async (request) => {
          hermesRequest = request;
          return {
            assistantText: "Forge response.",
            commandSpec: {},
            outboundActions: [],
            missingFields: [],
            safety: { allowed: true },
          };
        },
      },
      botTokenProvider: async () => "token",
      conversationModeRepo: {
        getMode: async () => "forge",
        setMode: async () => {},
      },
    });

    const update = makeTelegramUpdate({ text: "create a summarization minion" });
    const result = await runtime.handleTelegramUpdate({ update });

    assert.equal(result.status, "sent");
    assert.equal(sentMessages.length, 1);
    assert.ok(sentMessages[0].text.includes("Forge response."));
    assert.notEqual(hermesRequest, null);
    assert.equal(hermesRequest.context.conversationType, "forge");
  });

  test("handleTelegramUpdate passes minions from runtime options into hermes context", async () => {
    const { createTelegramBotRuntime } = await loadRuntime();

    let hermesRequest = null;
    const minions = [{ id: "m1", name: "TodoMinion", instructions: "manage todos" }];
    const runtime = createTelegramBotRuntime({
      telegramClient: { sendMessage: async () => ({ providerMessageId: 0 }) },
      resolveTelegramIdentity: async () => ({ userId: "user_1", tenantId: "tenant_1" }),
      hermesRuntime: {
        generateCommandResult: async (request) => {
          hermesRequest = request;
          return { assistantText: "ok", commandSpec: {}, outboundActions: [] };
        },
      },
      botTokenProvider: async () => "token",
      minions,
    });

    const update = makeTelegramUpdate({ text: "!hades summarize chat" });
    await runtime.handleTelegramUpdate({ update });

    assert.notEqual(hermesRequest, null);
    assert.equal(hermesRequest.context.minions, minions, "minions should be forwarded in context");
  });

  test("handleTelegramUpdate sends help in general mode for non-hades messages", async () => {
    const { createTelegramBotRuntime } = await loadRuntime();

    const sentMessages = [];
    const runtime = createTelegramBotRuntime({
      telegramClient: {
        sendMessage: async ({ chatId, text }) => {
          sentMessages.push({ chatId, text });
          return { providerMessageId: 0 };
        },
      },
      resolveTelegramIdentity: async () => ({ userId: "user_1", tenantId: "tenant_1" }),
      hermesRuntime: { generateCommandResult: async () => ({}) },
      botTokenProvider: async () => "token",
      conversationModeRepo: {
        getMode: async () => "general",
        setMode: async () => {},
      },
    });

    const update = makeTelegramUpdate({ text: "hello there" });
    const result = await runtime.handleTelegramUpdate({ update });

    assert.equal(result.status, "sent");
    assert.equal(result.reason, "non_command_help");
    assert.ok(sentMessages[0].text.includes("hades"));
  });
});
