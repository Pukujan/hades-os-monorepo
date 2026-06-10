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
    status: extra.status || "completed",
    suggestions: extra.suggestions || [],
    createdAt: extra.createdAt || new Date().toISOString()
  };
}

export function createHadesService({ repository, hermes }) {
  async function chat(body) {
    const payload = validateChatRequest(body);
    const conversation = repository.getOrCreateConversation({
      conversationId: payload.conversationId,
      userId: "local-user"
    });

    const userMessage = await repository.appendMessage({
      conversationId: conversation.id,
      idempotencyKey: `${payload.idempotencyKey}:user`,
      message: createMessage("user", payload.message, {
        id: payload.clientMessageId,
        status: "queued"
      })
    });

    const currentDraft = payload.currentDraft || repository.getSnapshot().conversations.find((entry) => entry.id === conversation.id)?.draftSnapshot || createEmptyDraft();
    const hermesResult = await hermes.buildResponse({
      userId: "local-user",
      conversationId: conversation.id,
      message: payload.message,
      currentDraft
    });

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
      source: hermesResult.source
    };
  }

  async function testMinion(body) {
    const payload = validateTestRequest(body);
    const testRun = await repository.saveTestRun({
      idempotencyKey: payload.idempotencyKey,
      run: {
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

  async function saveMinion(body) {
    const payload = validateSaveRequest(body);
    const minion = await repository.saveMinion({
      idempotencyKey: payload.idempotencyKey,
      minion: {
        userId: "local-user",
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

  async function assignMinion(body) {
    const payload = validateAssignmentRequest(body);
    const minion = repository.getMinion(payload.minionId);
    if (!minion) {
      throw new AppError("Minion not found", 404);
    }

    const social = getSocialById(payload.socialLinkId);
    const assignment = await repository.saveAssignment({
      idempotencyKey: payload.idempotencyKey,
      assignment: {
        userId: "local-user",
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

  return { chat, testMinion, saveMinion, assignMinion };
}
