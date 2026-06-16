import { parseHadesCommand } from "./hadesCommandParser.js";

function ensureFunction(fn, label) {
  if (typeof fn !== "function") {
    throw new Error(`${label} is not configured`);
  }
  return fn;
}

function normalizeCommandName(content = "") {
  const trimmed = String(content || "").trim();
  if (!trimmed) return null;
  const [firstToken] = trimmed.split(/\s+/);
  return firstToken || null;
}

function buildHermesRequest({ session, discordAccountId, channelId, messageId, content }) {
  const commandName = normalizeCommandName(content);
  const parsedCommand = parseHadesCommand(content);
  return {
    context: {
      userId: session.userId,
      tenantId: session.tenantId,
      provider: "discord",
      discordAccountId,
      channelId,
      messageId,
      ...(parsedCommand && { hadesParsedCommand: parsedCommand })
    },
    input: {
      content,
      messageId,
      channelId,
      commandName,
      ...(parsedCommand && { parsedCommand })
    },
    responseSchema: {
      type: "object",
      additionalProperties: false,
      required: ["assistantText", "commandSpec", "outboundActions", "missingFields", "safety"],
      properties: {
        assistantText: { type: "string" },
        sessionId: { type: ["string", "null"] },
        commandSpec: { type: "object", additionalProperties: true },
        outboundActions: { type: "array", items: { type: "object", additionalProperties: true } },
        missingFields: { type: "array", items: { type: "string" } },
        safety: { type: "object", additionalProperties: true }
      }
    },
    capabilities: {
      outboundActions: ["send_message", "send_gif"],
      persistence: ["save_execution"]
    }
  };
}

function pickPrimaryAction(outboundActions = []) {
  return outboundActions.find((action) => action?.type === "send_message" || action?.type === "send_gif") || null;
}

export function createDiscordBotRuntime({
  botTokenProvider,
  resolveDiscordIdentity,
  createDiscordClient,
  hermesRuntime,
  repository = {}
} = {}) {
  async function handleDiscordMessage({ discordAccountId, channelId, messageId, content }) {
    const session = await ensureFunction(resolveDiscordIdentity, "Discord identity resolver")({
      discordAccountId
    });

    if (!session) {
      throw new Error("Discord identity is not connected or authenticated");
    }

    const botToken = await ensureFunction(botTokenProvider, "Discord bot token provider")();
    if (!botToken) {
      throw new Error("Discord bot token is not configured");
    }

    const discordClient = await ensureFunction(createDiscordClient, "Discord bot client creator")({
      botToken
    });

    const hermesRequest = buildHermesRequest({
      session,
      discordAccountId,
      channelId,
      messageId,
      content
    });

    const commandResult = await ensureFunction(hermesRuntime?.generateCommandResult, "Hermes command runtime")(
      hermesRequest
    );

    const primaryAction = pickPrimaryAction(commandResult?.outboundActions || []);
    const sendResult = await ensureFunction(discordClient?.sendMessage, "Discord bot client")({
      channelId,
      content: primaryAction?.content || commandResult?.assistantText || "",
      gifUrl: primaryAction?.gifUrl || null,
      mediaUrl: primaryAction?.mediaUrl || null,
      replyToMessageId: messageId
    });

    if (typeof repository?.saveAgentExecution === "function") {
      await repository.saveAgentExecution({
        execution: {
          userId: session.userId,
          tenantId: session.tenantId,
          provider: "discord",
          discordAccountId,
          channelId,
          messageId,
          commandName: hermesRequest.input.commandName,
          sessionId: commandResult?.sessionId || null,
          status: "sent",
          source: "discord_bot_runtime",
          outboundActions: commandResult?.outboundActions || []
        }
      });
    }

    return {
      status: "sent",
      sessionId: commandResult?.sessionId || null,
      providerMessageId: sendResult?.providerMessageId || null
    };
  }

  return { handleDiscordMessage };
}
