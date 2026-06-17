const DEFAULT_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["assistantText", "commandSpec", "outboundActions", "missingFields", "safety"],
  properties: {
    assistantText: { type: "string" },
    sessionId: { type: ["string", "null"] },
    commandSpec: {
      type: "object",
      additionalProperties: true
    },
    outboundActions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: true
      }
    },
    missingFields: {
      type: "array",
      items: { type: "string" }
    },
    safety: {
      type: "object",
      additionalProperties: true
    }
  }
};

function normalizeCommandName(content = "") {
  const firstToken = String(content).trim().split(/\s+/)[0] || "";
  return firstToken || null;
}

function isCreateIntent(content = "", commandSpec = {}) {
  if (commandSpec?.persistAs === "minion" || commandSpec?.saveAs === "minion") {
    return true;
  }

  return /\bcreate\b/i.test(String(content));
}

function pickGifAction(outboundActions = []) {
  return outboundActions.find((action) => action?.type === "send_gif" || action?.type === "gif");
}

function buildMinionFromCommandResult({ userId, tenantId, content, commandResult }) {
  const commandSpec = commandResult?.commandSpec || {};

  return {
    userId,
    tenantId,
    name: commandSpec.name || normalizeCommandName(content) || "Discord command",
    description: commandSpec.description || commandResult?.assistantText || "Generated from a Discord command.",
    instructions: commandSpec.action || commandResult?.assistantText || "Execute the saved command.",
    category: commandSpec.category || "fun",
    triggerType: "command",
    commandName: commandSpec.name || normalizeCommandName(content),
    targetSocial: commandSpec.targetSocial || "discord",
    status: "active",
    runtimeSpec: {
      schemaVersion: "hades.minion.v1",
      source: "discord_hermes_command_flow",
      commandSpec,
      outboundActions: commandResult?.outboundActions || [],
      assistantText: commandResult?.assistantText || "",
      safety: commandResult?.safety || { allowed: true }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function ensureFunction(fn, label) {
  if (typeof fn !== "function") {
    throw new Error(`${label} is not configured`);
  }
  return fn;
}

export function createDiscordHermesCommandFlow({
  verifyDiscordAccount,
  hermesRuntime,
  gifProvider,
  mediaVerifier,
  discordClient,
  repository = {}
} = {}) {
  async function handleDiscordCommand({ discordAccountId, channelId, messageId, content }) {
    const session = await ensureFunction(verifyDiscordAccount, "Discord account verification")({
      discordAccountId
    });

    if (!session) {
      throw new Error("Discord account is not connected or unauthenticated");
    }

    const commandName = normalizeCommandName(content);
    const commandResult = await ensureFunction(hermesRuntime?.generateCommandResult, "Hermes command runtime")({
      context: {
        userId: session.userId,
        tenantId: session.tenantId,
        provider: "discord",
        discordAccountId: session.discordAccountId || discordAccountId,
        channelId,
        messageId
      },
      input: {
        content,
        messageId,
        channelId,
        commandName
      },
      responseSchema: DEFAULT_RESPONSE_SCHEMA,
      capabilities: {
        outboundActions: ["send_message", "send_gif"],
        persistence: ["save_minion"]
      }
    });

    const shouldSaveMinion = isCreateIntent(content, commandResult?.commandSpec);
    if (shouldSaveMinion && typeof repository?.saveMinion === "function") {
      await repository.saveMinion({
        minion: buildMinionFromCommandResult({
          userId: session.userId,
          tenantId: session.tenantId,
          content,
          commandResult
        })
      });
    }

    const gifAction = pickGifAction(commandResult?.outboundActions || []);
    let gif = null;
    let mediaVerificationResult = null;
    if (gifAction) {
      gif = await ensureFunction(gifProvider?.searchGif, "GIF provider")({
        query: gifAction.query || gifAction.searchQuery || commandResult?.commandSpec?.action || commandName || content,
        rating: gifAction.rating || "pg-13",
        limit: gifAction.limit || 1,
        tenantId: session.tenantId,
        userId: session.userId
      });

      if (gif?.url && typeof mediaVerifier?.verifyMediaUrl === "function") {
        mediaVerificationResult = await mediaVerifier.verifyMediaUrl({
          url: gif.url,
          allowedContentTypes: ["image/gif", "image/webp"],
        });
      }
    }

    let gifUrl = gif?.url || gif?.gifUrl || null;
    let assistantText = commandResult?.assistantText || "";

    if (mediaVerificationResult && !mediaVerificationResult.ok) {
      gifUrl = null;
      assistantText = assistantText || "I found a GIF, but it appears to be unavailable.";
      if (!assistantText.toLowerCase().includes("unavailable")) {
        assistantText = assistantText + " (GIF media unavailable after verification)";
      }
    }

    const sendResult = await ensureFunction(discordClient?.sendMessage, "Discord client")({
      channelId,
      content: assistantText,
      gifUrl,
      replyToMessageId: messageId
    });

    if (typeof repository?.saveAgentExecution === "function") {
      await repository.saveAgentExecution({
        execution: {
          userId: session.userId,
          tenantId: session.tenantId,
          provider: "discord",
          discordAccountId: session.discordAccountId || discordAccountId,
          channelId,
          messageId,
          commandName,
          sessionId: commandResult?.sessionId || null,
          status: "sent",
          source: "discord_hermes_command_flow",
          commandSpec: commandResult?.commandSpec || null,
          outboundActions: commandResult?.outboundActions || []
        }
      });
    }

    if (typeof repository?.saveOutboundDelivery === "function") {
      await repository.saveOutboundDelivery({
        userId: session.userId,
        tenantId: session.tenantId,
        provider: "discord",
        discordAccountId: session.discordAccountId || discordAccountId,
        channelId,
        messageId,
        providerMessageId: sendResult?.providerMessageId || null,
        content: assistantText,
        gifUrl,
        mediaVerification: mediaVerificationResult || undefined,
        source: "discord_hermes_command_flow"
      });
    }

    return {
      status: shouldSaveMinion ? "saved" : "sent",
      sessionId: commandResult?.sessionId || null,
      commandSpec: commandResult?.commandSpec || null,
      outboundActions: commandResult?.outboundActions || [],
      providerMessageId: sendResult?.providerMessageId || null
    };
  }

  return { handleDiscordCommand };
}
