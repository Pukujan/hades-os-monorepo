export async function seedHadesTestData(app, { users = [] } = {}) {
  const seedRoutes = app._router?.stack?.filter(
    (layer) => layer.route && layer.route.path === "/api/hades/seed"
  );

  if (seedRoutes?.length) {
    const http = await import("http");
    const server = http.createServer(app);
    await new Promise((resolve, reject) => {
      server.listen(0, () => {
        const port = server.address().port;
        fetch(`http://127.0.0.1:${port}/api/hades/seed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ users }),
        })
          .then(() => {
            server.close(resolve);
          })
          .catch(reject);
      });
    });
    return;
  }

  const { createMinionRepository } = await import("../repositories/minionRepository.js");
  const { createAssignmentRepository } = await import("../repositories/assignmentRepository.js");
  const { createConversationRepository } = await import("../repositories/conversationRepository.js");
  const { createDiscordConnectionRepository } = await import("../repositories/discordConnectionRepository.js");
  const { createTelegramConnectionRepository } = await import("../repositories/telegramConnectionRepository.js");

  for (const user of users) {
    const minionRepo = createMinionRepository({ storage: "memory" });
    for (const m of user.minions || []) {
      await minionRepo.create({ userId: user.userId, tenantId: user.tenantId, data: m });
    }

    const assignRepo = createAssignmentRepository({ storage: "memory" });
    for (const a of user.assignments || []) {
      await assignRepo.create({ userId: user.userId, tenantId: user.tenantId, data: a });
    }

    const convRepo = createConversationRepository({ storage: "memory" });
    for (const c of user.conversations || []) {
      await convRepo.createConversation({ userId: user.userId, tenantId: user.tenantId, data: c });
    }

    const discordRepo = createDiscordConnectionRepository({ storage: "memory" });
    for (const d of user.discordConnections || []) {
      await discordRepo.createOrUpdate({
        userId: user.userId,
        tenantId: user.tenantId,
        discordUserId: d.discord_user_id,
        guildId: d.guild_id,
        channelId: d.channel_id,
        status: d.status || "connected",
      });
    }

    const tgRepo = createTelegramConnectionRepository({ storage: "memory", crypto: null });
    for (const t of user.telegramConnections || []) {
      await tgRepo.createOrUpdate({
        userId: user.userId,
        tenantId: user.tenantId,
        telegramUserId: t.telegram_user_id || `tg_${user.userId}`,
        botToken: t.bot_token || "test:token",
        botUsername: t.bot_username || `${user.userId}_bot`,
        status: t.status || "connected",
      });
    }
  }
}
