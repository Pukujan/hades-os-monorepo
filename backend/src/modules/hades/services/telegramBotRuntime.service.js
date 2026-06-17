import { parseHadesCommand } from "./hadesCommandParser.js";
import { findMinionByCommand, normalizeSocialCommandName } from "./socialCommandRouting.js";

export function createTelegramBotRuntime({
  telegramClient,
  resolveTelegramIdentity,
  hermesRuntime,
  botTokenProvider,
  repository,
  conversationModeRepo,
  minions,
} = {}) {
  if (!telegramClient || !resolveTelegramIdentity || !hermesRuntime) {
    throw new Error("telegramBotRuntime: telegramClient, resolveTelegramIdentity, and hermesRuntime are required");
  }

  async function handleTelegramUpdate({ update } = {}) {
    const message = update?.message;
    if (!message?.text) {
      return { status: "ignored", reason: "no_text" };
    }

    const chatId = String(message.chat?.id || "");
    const messageId = message.message_id;

    const telegramAccountId = String(message.from?.id || "");
    const identity = await resolveTelegramIdentity({ telegramAccountId });

    if (!identity || !identity.userId) {
      throw new Error("Telegram identity is not connected to any account");
    }

    const { userId, tenantId } = identity;

    const modeRepo = conversationModeRepo || null;
    const conversationMode = modeRepo ? await modeRepo.getMode({ chatId, userId, tenantId }) : "general";

    const text = message.text.trim();
    const modeSwitch = detectModeSwitch(text, conversationMode);

    if (modeSwitch === "forge") {
      if (modeRepo) await modeRepo.setMode({ chatId, userId, tenantId, mode: "forge" });
      const replyText = "Switched to **Forge** mode. I am now ready to create, edit, and manage minions.";
      await telegramClient.sendMessage({ chatId, text: replyText, parseMode: "Markdown", replyToMessageId: messageId });
      return { status: "sent", reason: "mode_switch_forge" };
    }

    if (modeSwitch === "general") {
      if (modeRepo) await modeRepo.setMode({ chatId, userId, tenantId, mode: "general" });
      const replyText = "Switched to **General** mode. I am now ready for general Hades commands.";
      await telegramClient.sendMessage({ chatId, text: replyText, parseMode: "Markdown", replyToMessageId: messageId });
      return { status: "sent", reason: "mode_switch_general" };
    }

    const parsed = parseHadesCommand(text);

    if (!parsed) {
      if (conversationMode === "forge") {
        return processAsHermesCommand({ text, parsed: { prefix: "hades", rawArgs: text, action: text || null }, conversationType: "forge" });
      }

      if (minions?.length > 0) {
        const matchedMinion = findMinionByCommand(text, minions);
        if (matchedMinion) {
          const commandName = normalizeSocialCommandName(text);
          const execResult = await hermesRuntime.executeMinion({
            context: { userId, tenantId, provider: "telegram", accountId: telegramAccountId, channelId: chatId, messageId },
            minion: matchedMinion,
            assignment: null,
            trigger: { content: text, commandName, triggerType: "command", provider: "telegram" },
          });

          const replyText = buildTelegramReply({ assistantText: execResult?.assistantText || "", outboundActions: execResult?.outboundActions || [] });
          await telegramClient.sendMessage({ chatId, text: replyText, parseMode: "Markdown", replyToMessageId: messageId });

          if (repository?.saveAgentExecution) {
            await repository.saveAgentExecution({
              execution: { provider: "telegram", userId, tenantId, chatId, input: text, response: replyText, providerMessageId: null, timestamp: new Date().toISOString() },
            });
          }

          return { status: "sent", reason: "minion_command" };
        }
      }

      const replyText = `${text} — I only respond to hades or forge commands. Try: hades <your request>`;
      await telegramClient.sendMessage({
        chatId,
        text: replyText,
        parseMode: "Markdown",
        replyToMessageId: messageId,
      });
      return { status: "sent", reason: "non_command_help" };
    }

    return processAsHermesCommand({ text, parsed, conversationType: conversationMode });

    async function processAsHermesCommand({ text, parsed, conversationType }) {
      let assistantText = "";
      let outboundActions = [];

      try {
        const result = await hermesRuntime.generateCommandResult({
          input: {
            content: text,
            parsedCommand: parsed,
          },
          context: {
            provider: "telegram",
            userId,
            tenantId,
            chatId,
            messageId,
            conversationType,
            minions,
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
            input: text,
            parsedCommand: parsed,
            response: replyText,
            providerMessageId: sendResult?.providerMessageId,
            timestamp: new Date().toISOString(),
          },
        });
      }

      return { status: "sent", providerMessageId: sendResult?.providerMessageId };
    }
  }

  return { handleTelegramUpdate };
}

function detectModeSwitch(text, currentMode) {
  const lower = text.toLowerCase();
  if (lower === "forge") return "forge";
  if (lower === "hades" && currentMode === "forge") return "general";
  return null;
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
