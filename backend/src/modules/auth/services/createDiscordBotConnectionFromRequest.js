function ensureFunction(fn, label) {
  if (typeof fn !== "function") {
    throw new Error(`${label} is not configured`);
  }
  return fn;
}

function buildConnectedResponse({ session, botInfo }) {
  return {
    connected: true,
    provider: "discord",
    userId: session.userId,
    tenantId: session.tenantId,
    discordAccountId: session.discordAccountId || null,
    botConnected: botInfo?.status === "ready" || botInfo?.status === "connected",
    botUserId: botInfo?.botUserId || null
  };
}

function buildConnectionRecord({ session, botInfo }) {
  return {
    provider: "discord",
    userId: session.userId,
    tenantId: session.tenantId,
    discordAccountId: session.discordAccountId || null,
    botConnected: botInfo?.status === "ready" || botInfo?.status === "connected",
    botUserId: botInfo?.botUserId || null,
    status: "connected",
    linkedAt: new Date().toISOString()
  };
}

export async function createDiscordBotConnectionFromRequest({
  headers = {},
  body = {},
  verifySupabaseSession,
  getDiscordBotToken,
  createDiscordBotClient,
  saveDiscordConnection
}) {
  try {
    const session = await ensureFunction(verifySupabaseSession, "Supabase session verifier")(headers);
    if (!session) {
      return {
        status: 401,
        body: {
          error: "UNAUTHENTICATED"
        }
      };
    }

    const botToken = await ensureFunction(getDiscordBotToken, "Discord bot token provider")();
    if (!botToken) {
      throw new Error("Discord bot token is not configured");
    }

    const botClient = await ensureFunction(createDiscordBotClient, "Discord bot client creator")({
      botToken
    });

    const botInfo =
      typeof botClient?.inspectConnection === "function"
        ? await botClient.inspectConnection()
        : {
            status: "ready",
            botUserId: null
          };

    const connection = buildConnectionRecord({ session, botInfo, body });
    if (typeof saveDiscordConnection === "function") {
      await saveDiscordConnection({ connection });
    }

    return {
      status: 200,
      body: buildConnectedResponse({ session, botInfo })
    };
  } catch (error) {
    if (/unauthenticated|not configured/i.test(error?.message || "")) {
      return {
        status: 401,
        body: {
          error: "UNAUTHENTICATED"
        }
      };
    }

    return {
      status: 500,
      body: {
        error: "DISCORD_BOT_CONNECTION_FAILED"
      }
    };
  }
}
