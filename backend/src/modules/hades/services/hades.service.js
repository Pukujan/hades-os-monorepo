import { randomUUID } from "crypto";
import { AppError } from "../../../shared/http/errors.js";
import { buildTestOutput, createDraftFromMessage } from "../parser.js";
import { createEmptyDraft, formatSocialLabel, getSocialById, missingDraftFields } from "../data.js";
import { validateAssignmentRequest, validateChatRequest, validateSaveRequest, validateTestRequest } from "../validators.js";

function createMessage(role, content, extra = {}) {
  return {
    id: extra.id || `msg-${randomUUID().slice(0, 8)}`,
    role,
    content,
    userId: extra.userId,
    status: extra.status || "completed",
    suggestions: extra.suggestions || [],
    createdAt: extra.createdAt || new Date().toISOString()
  };
}

export function createHadesService({ repository, hermes, config = {} }) {
  function resolveUserId(authContext) {
    return authContext?.userId || "local-user";
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
    return repository.getBootstrapState({
      conversationId,
      userId: authContext?.userId || userId
    });
  }

  async function chat(body, authContext = null) {
    const payload = validateChatRequest(body);
    const userId = resolveUserId(authContext);
    const conversation = repository.getOrCreateConversation({
      conversationId: payload.conversationId,
      userId
    });

    const userMessage = await repository.appendMessage({
      conversationId: conversation.id,
      idempotencyKey: `${payload.idempotencyKey}:user`,
      message: createMessage("user", payload.message, {
        id: payload.clientMessageId,
        status: "queued",
        userId
      })
    });

    const currentDraft = payload.currentDraft || repository.getSnapshot().conversations.find((entry) => entry.id === conversation.id)?.draftSnapshot || createEmptyDraft();
    const hermesResult = await hermes.buildResponse({
      userId,
      conversationId: conversation.id,
      message: payload.message,
      currentDraft
    });

    if (typeof repository.saveAgentExecution === "function") {
      await repository.saveAgentExecution({
        idempotencyKey: `${payload.idempotencyKey}:agent`,
        execution: {
          conversationId: conversation.id,
          userId,
          sessionId: hermesResult.sessionId || null,
          source: hermesResult.source,
          status: hermesResult.source === "hermes_runtime" ? "completed" : "fallback",
          errorMessage: null
        }
      });
    }

    const assistantMessage = await repository.appendMessage({
      conversationId: conversation.id,
      idempotencyKey: `${payload.idempotencyKey}:assistant`,
      message: createMessage("assistant", hermesResult.assistantMessage.content, {
        status: hermesResult.assistantMessage.status,
        suggestions: hermesResult.assistantMessage.suggestions
      })
    });

    await repository.saveConversationDraft({
      conversationId: conversation.id,
      draftSnapshot: hermesResult.draft
    });

    return {
      conversationId: conversation.id,
      userMessage,
      assistantMessage,
      draft: hermesResult.draft,
      missingFields: hermesResult.missingFields,
      suggestions: hermesResult.suggestions,
      source: hermesResult.source,
      sessionId: hermesResult.sessionId || null
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
        status: "passed"
      }
    });

    const draft = {
      ...payload.draft,
      status: "tested",
      testInput: payload.testInput || payload.draft.testInput || `User types: ${payload.draft.commandName || payload.draft.name || "test"}`
    };

    return { testRun, draft };
  }

  async function saveMinion(body, authContext = null) {
    const payload = validateSaveRequest(body);
    const userId = resolveUserId(authContext);
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
        updatedAt: new Date().toISOString()
      }
    });

    return { minion };
  }

  async function assignMinion(body, authContext = null) {
    const payload = validateAssignmentRequest(body);
    const userId = resolveUserId(authContext);
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
        updatedAt: new Date().toISOString()
      }
    });

    return {
      assignment,
      minion,
      socialLabel: formatSocialLabel(payload.socialLinkId)
    };
  }

  return { readiness, bootstrap, chat, testMinion, saveMinion, assignMinion };
}
