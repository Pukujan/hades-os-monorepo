import { parseHadesCommand } from "./hadesCommandParser.js";

export function createTelegramBotRuntime({
  telegramClient,
  resolveTelegramIdentity,
  hermesRuntime,
  botTokenProvider,
  repository,
} = {}) {
  if (!telegramClient || !resolveTelegramIdentity || !hermesRuntime) {
    throw new Error("telegramBotRuntime: telegramClient, resolveTelegramIdentity, and hermesRuntime are required");
  }

  async function handleTelegramUpdate({ update } = {}) {
    const message = update?.message;
    if (!message?.text) {
      return { status: "ignored", reason: "no_text" };
    }

    const parsed = parseHadesCommand(message.text);
    if (!parsed) {
      return { status: "ignored", reason: "not_a_hades_command" };
    }

    const telegramAccountId = String(message.from?.id || "");
    const identity = await resolveTelegramIdentity({ telegramAccountId });

    if (!identity || !identity.userId) {
      throw new Error("Telegram identity is not connected to any account");
    }

    const { userId, tenantId } = identity;
    const chatId = String(message.chat?.id || "");
    const messageId = message.message_id;

    let assistantText = "";
    let outboundActions = [];

    try {
      const result = await hermesRuntime.generateCommandResult({
        input: {
          content: message.text,
          parsedCommand: parsed,
        },
        context: {
          provider: "telegram",
          userId,
          tenantId,
          chatId,
          messageId,
        },
      });

      assistantText = result?.assistantText || "";
      outboundActions = result?.outboundActions || [];
    } catch (hermesError) {
      assistantText = `Hermes processing failed: ${hermesError.message}`;
    }

    const replyText = buildTelegramReply({ assistantText, outboundActions });

    const sendResult = await telegramClient.sendMessage({
      chatId,
      text: replyText,
      parseMode: "Markdown",
      replyToMessageId: messageId,
    });

    if (repository?.saveAgentExecution) {
      await repository.saveAgentExecution({
        execution: {
          provider: "telegram",
          userId,
          tenantId,
          chatId,
          input: message.text,
          parsedCommand: parsed,
          response: replyText,
          providerMessageId: sendResult?.providerMessageId,
          timestamp: new Date().toISOString(),
        },
      });
    }

    return { status: "sent", providerMessageId: sendResult?.providerMessageId };
  }

  return { handleTelegramUpdate };
}

function buildTelegramReply({ assistantText, outboundActions }) {
  const parts = [];
  if (assistantText) parts.push(assistantText);

  if (outboundActions?.length > 0) {
    for (const action of outboundActions) {
      if (action.type === "send_message" && action.content) {
        parts.push(`\n${action.content}`);
      }
    }
  }

  return parts.join("\n") || "Processed.";
}
