import { randomUUID } from "crypto";
import { AppError } from "../../../shared/http/errors.js";
import { buildTestOutput, createDraftFromMessage } from "../parser.js";
import { createEmptyDraft, formatSocialLabel, getSocialById, missingDraftFields } from "../data.js";
import { validateAssignmentRequest, validateChatRequest, validateSaveRequest, validateTestRequest } from "../validators.js";
import { createTelegramClient } from "./telegramClient.js";
import { createTelegramBotRuntime } from "./telegramBotRuntime.service.js";

function createMessage(role, content, extra = {}) {
  return {
    id: randomUUID(),
    role,
    content,
    userId: extra.userId,
    clientMessageId: extra.clientMessageId || null,
    status: extra.status || "completed",
    suggestions: extra.suggestions || [],
    actions: extra.actions || [],
    created_at: extra.created_at || new Date().toISOString()
  };
}

export function createHadesService({ repository, scopedRepos, hermes, config = {}, minionAssignmentRuntime, context, telegramClientFactory, minionLogsRepo, notificationsRepo, hermesRuntime, telegramWebhookBaseUrl } = {}) {
  function resolveUserId(authContext) {
    if (authContext?.userId) return authContext.userId;
    if (process.env.NODE_ENV !== "production") {
      return process.env.HADES_USER_ID || "local-user";
    }
    return null;
  }

  async function readiness() {
    return config.readiness || {
      status: "ok",
      mode: "local",
      storage: { mode: "memory", configured: false },
      ai: { provider: "openrouter", model: "deepseek/deepseek-v4-flash", configured: false },
      cors: { origin: null },
      deploy: { backendPlatform: "railway", frontendPlatform: "vercel" }
    };
  }

  async function bootstrap({ conversationId = null, userId = "local-user" } = {}, authContext = null) {
    const actualUserId = authContext?.userId || userId;
    const tenantId = authContext?.tenantId || actualUserId;

    if (scopedRepos?.minions) {
      const scopedMinions = await scopedRepos.minions.listByUser({ userId: actualUserId, tenantId });
      const scopedAssignments = scopedRepos.assignments
        ? await scopedRepos.assignments.listByUser({ userId: actualUserId, tenantId })
        : [];
      const scopedConversations = scopedRepos.conversations
        ? await scopedRepos.conversations.listConversations({ userId: actualUserId, tenantId })
        : [];

      return {
        minions: scopedMinions,
        assignments: scopedAssignments,
        conversations: scopedConversations,
        authContext: { userId: actualUserId, tenantId },
      };
    }

    return repository.getBootstrapState({
      conversationId,
      userId: actualUserId,
    });
  }

  async function chat(body, authContext = null) {
    const payload = validateChatRequest(body);
    const userId = resolveUserId(authContext);
    const tenantId = authContext?.tenantId || userId;
    const conversationType = payload.conversationType;

    const convRepo = scopedRepos?.conversations;

    const conversation = convRepo
      ? await (async () => {
          const targetId = payload.conversationId;
          if (targetId) {
            const existing = (await convRepo.listConversations({ userId, tenantId, contextType: conversationType })).find((c) => c.id === targetId);
            if (existing) return existing;
          }
          const all = await convRepo.listConversations({ userId, tenantId, contextType: conversationType });
          if (all.length > 0) return all[0];
          return convRepo.createConversation({ userId, tenantId, contextType: conversationType, data: {} });
        })()
      : repository.getOrCreateConversation({ conversationId: payload.conversationId, userId });

    const userKey = `${payload.idempotencyKey}:user`;
    const userMessage = convRepo
      ? await convRepo.addMessage({
          userId, tenantId,
          conversationId: conversation.id,
          data: createMessage("user", payload.message, { clientMessageId: payload.clientMessageId, status: "queued", userId }),
          idempotencyKey: userKey,
        })
      : await repository.appendMessage({
          conversationId: conversation.id,
          idempotencyKey: userKey,
          message: createMessage("user", payload.message, { id: payload.clientMessageId, status: "queued", userId }),
        });

    const currentDraft = payload.currentDraft || createEmptyDraft();

    const recentMessages = convRepo
      ? await convRepo.listMessages({ userId, tenantId, conversationId: conversation.id })
      : repository.listMessages(conversation.id);

    const scopedMemory = scopedRepos?.executions
      ? await scopedRepos.executions.listByUser({ userId, tenantId })
      : [];

    const chatMinions = scopedRepos?.minions
      ? await scopedRepos.minions.listByUser({ userId, tenantId })
      : [];

    const hermesResult = await hermes.buildResponse({
      userId,
      conversationId: conversation.id,
      message: payload.message,
      messages: recentMessages || [],
      currentDraft,
      context: conversationType,
      minions: chatMinions,
    });

    try {
      if (scopedRepos?.executions) {
        await scopedRepos.executions.create({
          userId, tenantId,
          data: {
            conversation_id: conversation.id,
            session_id: hermesResult.sessionId || null,
            source: hermesResult.source,
            status: hermesResult.source === "hermes_runtime" ? "completed" : "fallback",
            error_message: null,
          },
        });
      } else if (typeof repository.saveAgentExecution === "function") {
        await repository.saveAgentExecution({
          idempotencyKey: `${payload.idempotencyKey}:agent`,
          execution: {
            conversation_id: conversation.id,
            userId,
            session_id: hermesResult.sessionId || null,
            source: hermesResult.source,
            status: hermesResult.source === "hermes_runtime" ? "completed" : "fallback",
            error_message: null,
          },
        });
      }
    } catch (persistError) {
      console.error("Failed to persist agent execution:", persistError.message);
    }

    const messageActions = hermesResult.assistantMessage.actions || [];
    const assistantKey = `${payload.idempotencyKey}:assistant`;
    const assistantMessage = convRepo
      ? await convRepo.addMessage({
          userId, tenantId,
          conversationId: conversation.id,
          data: createMessage("assistant", hermesResult.assistantMessage.content, {
            status: hermesResult.assistantMessage.status,
            suggestions: hermesResult.assistantMessage.suggestions,
            actions: messageActions,
          }),
          idempotencyKey: assistantKey,
        })
      : await repository.appendMessage({
          conversationId: conversation.id,
          idempotencyKey: assistantKey,
          message: createMessage("assistant", hermesResult.assistantMessage.content, {
            status: hermesResult.assistantMessage.status,
            suggestions: hermesResult.assistantMessage.suggestions,
            actions: messageActions,
          }),
        });

    return {
      conversationId: conversation.id,
      userMessage,
      assistantMessage,
      actions: messageActions,
      cards: hermesResult.cards || [],
      draft: hermesResult.draft,
      missingFields: hermesResult.missingFields,
      suggestions: hermesResult.suggestions,
      source: hermesResult.source,
      sessionId: hermesResult.sessionId || null,
    };
  }

  async function testMinion(body, authContext = null) {
    const payload = validateTestRequest(body);
    const userId = resolveUserId(authContext);
    const testRun = await repository.saveTestRun({
      idempotencyKey: payload.idempotencyKey,
      run: {
        userId,
        draftSnapshot: JSON.parse(JSON.stringify(payload.draft)),
        testInput: payload.testInput || payload.draft.testInput || null,
        output: buildTestOutput(payload.draft),
        status: "passed",
      },
    });

    const draft = {
      ...payload.draft,
      status: "tested",
      testInput: payload.testInput || payload.draft.testInput || `User types: ${payload.draft.commandName || payload.draft.name || "test"}`,
    };

    return { testRun, draft };
  }

  async function saveMinion(body, authContext = null) {
    const payload = validateSaveRequest(body);
    const userId = resolveUserId(authContext);
    const tenantId = authContext?.tenantId || userId;

    const scopedRepo = scopedRepos?.minions;
    if (scopedRepo) {
      const minion = await scopedRepo.create({
        userId,
        tenantId,
        data: {
          icon: payload.draft.category === "fun" ? "cat" : payload.draft.category === "chat" ? "chat" : payload.draft.category === "shopping" ? "shopping" : payload.draft.category === "dev" ? "github" : "task",
          name: payload.draft.name,
          description: payload.draft.description,
          instructions: payload.draft.action,
          category: payload.draft.category,
          trigger_type: payload.draft.triggerType,
          command_name: payload.draft.commandName,
          status: "active",
          target_social: payload.draft.targetSocial,
        },
      });
      return { minion };
    }

    const minion = await repository.saveMinion({
      idempotencyKey: payload.idempotencyKey,
      minion: {
        userId,
        icon: payload.draft.category === "fun" ? "cat" : payload.draft.category === "chat" ? "chat" : payload.draft.category === "shopping" ? "shopping" : payload.draft.category === "dev" ? "github" : "task",
        name: payload.draft.name,
        description: payload.draft.description,
        instructions: payload.draft.action,
        category: payload.draft.category,
        triggerType: payload.draft.triggerType,
        commandName: payload.draft.commandName,
        status: "active",
        targetSocial: payload.draft.targetSocial,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    return { minion };
  }

  async function assignMinion(body, authContext = null) {
    const payload = validateAssignmentRequest(body);
    const userId = authContext?.userId;
    const tenantId = authContext?.tenantId || userId;

    if (scopedRepos?.minions) {
      const minion = await scopedRepos.minions.findById({
        id: payload.minionId,
        userId,
        tenantId,
      });
      if (!minion) {
        throw new AppError("Minion not found", 404);
      }

      const social = getSocialById(payload.socialLinkId);
      const assignment = await scopedRepos.assignments.create({
        userId,
        tenantId,
        data: {
          minion_id: minion.id,
          provider: social?.provider || payload.socialLinkId,
          command_name: payload.commandName || minion.command_name || null,
          social_link_id: payload.socialLinkId,
          status: "active",
        },
      });

      return {
        assignment: {
          user_id: userId,
          tenant_id: tenantId,
          minion_id: minion.id,
          socialLinkId: payload.socialLinkId,
          provider: social?.provider || payload.socialLinkId,
          command_name: payload.commandName || minion.command_name || null,
          status: "active",
          ...assignment,
        },
        minion,
        socialLabel: formatSocialLabel(payload.socialLinkId),
      };
    }

    const minion = repository.getMinion(payload.minionId);
    if (!minion) {
      throw new AppError("Minion not found", 404);
    }

    const social = getSocialById(payload.socialLinkId);
    const assignment = await repository.saveAssignment({
      idempotencyKey: payload.idempotencyKey,
      assignment: {
        userId,
        minionId: minion.id,
        socialLinkId: social?.id || payload.socialLinkId,
        scope: social?.provider === "private" ? "private" : "social",
        commandName: payload.commandName || minion.commandName || null,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    return { assignment, minion, socialLabel: formatSocialLabel(payload.socialLinkId) };
  }

  async function getConversationMessages(conversationId, authContext) {
    const userId = authContext?.userId;
    const tenantId = authContext?.tenantId || userId;

    if (scopedRepos?.conversations) {
      const messages = await scopedRepos.conversations.listMessages({
        userId,
        tenantId,
        conversationId,
      });
      return messages.length ? messages : null;
    }

    const conversation = repository.getConversation(conversationId);
    if (!conversation) return null;
    return repository.listMessages(conversationId);
  }

  async function clearMessages(conversationId, authContext) {
    const userId = authContext?.userId;
    const tenantId = authContext?.tenantId || userId;

    if (scopedRepos?.conversations) {
      const result = await scopedRepos.conversations.clearMessages({
        userId,
        tenantId,
        conversationId,
      });
      return result;
    }

    const conversation = repository.getConversation(conversationId);
    if (!conversation) {
      throw new AppError("Conversation not found", 404);
    }
    return repository.deleteConversationMessages(conversationId);
  }

  async function listSocialConnections(authContext) {
    const userId = authContext?.userId;
    const tenantId = authContext?.tenantId || userId;
    const socials = [];

    if (scopedRepos?.discordConnections) {
      const discord = await scopedRepos.discordConnections.findPublicByUser({ userId, tenantId });
      if (discord) socials.push({ provider: "discord", ...discord });
    }

    if (scopedRepos?.telegramConnections) {
      const telegram = await scopedRepos.telegramConnections.findPublicByUser({ userId, tenantId });
      if (telegram) socials.push({ provider: "telegram", ...telegram });
    }

    if (scopedRepos?.gitHubConnections) {
      const github = await scopedRepos.gitHubConnections.findPublicByUser({ userId, tenantId });
      if (github) socials.push({ provider: "github", ...github });
    }

    return socials;
  }

function last4(str) {
  if (!str || str.length < 4) return str || "";
  return str.slice(-4);
}

async function saveTelegramToken(body, authContext) {
    const userId = authContext?.userId;
    const tenantId = authContext?.tenantId || userId;
    const { token } = body || {};

    if (!token) {
      throw new AppError("Token is required", 400);
    }

    let tgClient;
    if (telegramClientFactory) {
      tgClient = await telegramClientFactory(token);
    } else {
      tgClient = await createTelegramClient({ botToken: token });
    }

    let botInfo;
    try {
      botInfo = await tgClient.getMe();
    } catch {
      if (scopedRepos?.telegramConnections) {
        try {
          await scopedRepos.telegramConnections.createOrUpdate({
            userId,
            tenantId,
            telegramUserId: "unknown",
            botToken: token,
            botUsername: null,
            status: "token_invalid",
          });
        } catch {
          // swallow — best-effort record of invalid token
        }
      }
      throw new AppError("Token validation failed", 400);
    }

    if (scopedRepos?.telegramConnections) {
      await scopedRepos.telegramConnections.createOrUpdate({
        userId,
        tenantId,
        telegramUserId: String(botInfo.id || token.slice(0, 8)),
        botToken: token,
        botUsername: botInfo.username || null,
        status: "connected",
      });
    }

    if (telegramWebhookBaseUrl) {
      try {
        await tgClient.setWebhook({ url: `${telegramWebhookBaseUrl}/api/hades/triggers/telegram/${userId}` });
      } catch (webhookErr) {
        console.error(`Failed to register Telegram webhook for user ${userId}:`, webhookErr.message);
      }
    }

    return { status: "connected", botUsername: botInfo.username || null, token_last4: last4(token) };
  }

  async function saveDiscordToken(body, authContext) {
    const userId = authContext?.userId;
    const tenantId = authContext?.tenantId || userId;
    const { token } = body || {};

    if (!token) {
      throw new AppError("Token is required", 400);
    }

    if (!scopedRepos?.discordConnections) {
      throw new AppError("Discord connections repository not available", 501);
    }

    const result = await scopedRepos.discordConnections.saveToken({
      userId,
      tenantId,
      token,
      botUsername: null,
    });

    return { status: "connected", token_last4: last4(token) };
  }

  async function saveGitHubToken(body, authContext) {
    const userId = authContext?.userId;
    const tenantId = authContext?.tenantId || userId;
    const { token } = body || {};

    if (!token) {
      throw new AppError("Token is required", 400);
    }

    if (!scopedRepos?.gitHubConnections) {
      throw new AppError("GitHub connections repository not available", 501);
    }

    const result = await scopedRepos.gitHubConnections.saveToken({
      userId,
      tenantId,
      token,
      gitHubUsername: null,
    });

    return { status: "connected", token_last4: last4(token) };
  }

  async function deleteTelegramToken(authContext) {
    const userId = authContext?.userId;
    const tenantId = authContext?.tenantId || userId;

    if (!scopedRepos?.telegramConnections) {
      throw new AppError("Telegram connections repository not available", 501);
    }

    const connection = await scopedRepos.telegramConnections.findByUserId({ userId, tenantId });
    if (!connection) {
      throw new AppError("No Telegram connection found", 404);
    }

    await scopedRepos.telegramConnections.delete({ id: connection.id });
    return { deleted: true };
  }

  const dedupStore = scopedRepos?.processedUpdates || null;
  const processedUpdates = new Set();

  async function handleTelegramWebhook({ update, userId, tenantId } = {}) {
    if (!scopedRepos?.telegramConnections) {
      throw new AppError("Telegram connections repository not available", 501);
    }

    if (update?.update_id != null) {
      if (dedupStore) {
        const existing = await dedupStore.has({ updateId: update.update_id, userId, tenantId });
        if (existing) {
          return { status: "duplicate_ignored", reason: "update_id_already_processed" };
        }
        await dedupStore.mark({ updateId: update.update_id, userId, tenantId });
      } else {
        if (processedUpdates.has(update.update_id)) {
          return { status: "duplicate_ignored", reason: "update_id_already_processed" };
        }
        processedUpdates.add(update.update_id);
      }
    }

    const connection = await scopedRepos.telegramConnections.findPublicByUser({ userId, tenantId });
    if (!connection) {
      return { status: "ignored", reason: "no_connection" };
    }

    const tokenResult = await scopedRepos.telegramConnections.findRuntimeTokenByTelegramUserId({
      telegramUserId: connection.telegram_user_id,
    });
    if (!tokenResult?.botToken) {
      return { status: "ignored", reason: "no_token" };
    }

    const tgClient = telegramClientFactory
      ? await telegramClientFactory(tokenResult.botToken)
      : await createTelegramClient({ botToken: tokenResult.botToken });
    const resolveTelegramIdentity = async () => ({ userId, tenantId });

    const telegramMinions = scopedRepos?.minions
      ? await scopedRepos.minions.listByUser({ userId, tenantId })
      : [];

    const runtime = createTelegramBotRuntime({
      telegramClient: tgClient,
      resolveTelegramIdentity,
      hermesRuntime,
      botTokenProvider: null,
      conversationModeRepo: scopedRepos?.conversationModes || null,
      repository: scopedRepos?.executions
        ? { saveAgentExecution: ({ execution }) => scopedRepos.executions.create({ userId, tenantId, data: execution }) }
        : null,
      minions: telegramMinions,
    });

    return runtime.handleTelegramUpdate({ update });
  }

  async function listMinions(authContext) {
    const userId = resolveUserId(authContext);
    const tenantId = authContext?.tenantId || userId;
    if (scopedRepos?.minions) {
      return scopedRepos.minions.listByUser({ userId, tenantId });
    }
    return repository.listMinions();
  }

  async function getMinion(minionId, authContext) {
    const userId = resolveUserId(authContext);
    const tenantId = authContext?.tenantId || userId;
    if (scopedRepos?.minions) {
      return scopedRepos.minions.findById({ id: minionId, userId, tenantId });
    }
    return repository.getMinion(minionId);
  }

  async function getMinionLogs(minionId, authContext) {
    const userId = resolveUserId(authContext);
    const tenantId = authContext?.tenantId || userId;
    if (minionLogsRepo) {
      return minionLogsRepo.listLogsByMinionId(minionId);
    }
    return [];
  }

  async function listNotifications(authContext) {
    const userId = resolveUserId(authContext);
    const tenantId = authContext?.tenantId || userId;
    if (notificationsRepo) {
      return notificationsRepo.listNotifications({ userId });
    }
    return [];
  }

  async function updateMinion(minionId, updates, authContext) {
    if (typeof updates !== "object" || updates === null) {
      throw new AppError("Updates body is required", 400);
    }
    const userId = resolveUserId(authContext);
    if (scopedRepos?.minions) {
      return scopedRepos.minions.update({ id: minionId, userId, data: updates });
    }
    return repository.updateMinion(minionId, updates);
  }

  async function deleteMinion(minionId, authContext) {
    const userId = resolveUserId(authContext);
    if (scopedRepos?.minions) {
      return scopedRepos.minions.delete({ id: minionId, userId });
    }
    return repository.deleteMinion(minionId);
  }

  async function handleTrigger(body, authContext = null) {
    if (!minionAssignmentRuntime) {
      throw new AppError("Minion assignment runtime is not configured", 501);
    }
    return minionAssignmentRuntime.handleSocialTrigger(body);
  }

  return {
    readiness,
    bootstrap,
    chat,
    testMinion,
    saveMinion,
    assignMinion,
    getConversationMessages,
    clearMessages,
    listSocialConnections,
    saveTelegramToken,
    saveDiscordToken,
    saveGitHubToken,
    deleteTelegramToken,
    handleTelegramWebhook,
    handleTrigger,
    listMinions,
    getMinion,
    getMinionLogs,
    listNotifications,
    updateMinion,
    deleteMinion,
  };
}
