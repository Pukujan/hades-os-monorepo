import { createEmptyDraft, missingDraftFields, VALID_CATEGORIES, VALID_TARGET_SOCIALS, VALID_TRIGGER_TYPES } from "../data.js";
import { sanitizeAssistantText } from "../parser.js";
import { guardGeneralChatScope } from "./chatModeGuard.js";
import { normalizeChatActions } from "./chatActions.js";
import { normalizeChatCards } from "./chatCards.js";

function isValidEnum(value, allowed) {
  return value == null || allowed.includes(value);
}

function normalizePatch(draft, patch = {}) {
  const next = { ...draft };
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      next[key] = value;
    }
  }
  return next;
}

function ensureRuntime(hermesRuntime) {
  if (!hermesRuntime?.generateDraft) {
    throw new Error("Hermes runtime is not configured");
  }
  return hermesRuntime;
}

function wrapGeneralResult(result) {
  const rawActions = Array.isArray(result.actions) ? result.actions : [];
  const normalized = normalizeChatActions(rawActions);
  const cards = normalizeChatCards(result.cards);
  const response = {
    reply: sanitizeAssistantText(result.assistantText || result.reply || ""),
    actions: normalized,
  };
  const guarded = guardGeneralChatScope(response);
  return {
    assistantMessage: {
      role: "assistant",
      content: guarded.reply,
      status: "completed",
      suggestions: [],
      actions: Array.isArray(guarded.actions) ? guarded.actions : [],
    },
    cards,
    draft: createEmptyDraft(),
    missingFields: [],
    suggestions: [],
    source: result.source || "hermes_runtime",
    sessionId: result.sessionId || null,
    guard: guarded.guard || null,
  };
}

export function createHermesService({ hermesRuntime = null } = {}) {
  async function buildResponse({ userId = "local-user", conversationId, message, messages = [], currentDraft = createEmptyDraft(), context = "general" }) {
    const runtime = ensureRuntime(hermesRuntime);
    const result = await runtime.generateDraft({
      userId,
      conversationId,
      message,
      messages,
      currentDraft,
      context
    });

    if (context === "general" || context === "minions") {
      return wrapGeneralResult(result);
    }

    if (
      !isValidEnum(result?.draftPatch?.category, VALID_CATEGORIES) ||
      !isValidEnum(result?.draftPatch?.triggerType, VALID_TRIGGER_TYPES) ||
      !isValidEnum(result?.draftPatch?.targetSocial, VALID_TARGET_SOCIALS)
    ) {
      throw new Error("Invalid draft patch from Hermes runtime");
    }
    const draft = normalizePatch(currentDraft, result.draftPatch || {});
    const missing = result.missingFields?.length ? result.missingFields : missingDraftFields(draft);
    draft.status = missing.length ? "incomplete" : "ready_to_test";

    return {
      assistantMessage: {
        role: "assistant",
        content: sanitizeAssistantText(result.assistantText || "Draft updated."),
        status: "completed",
        suggestions: result.suggestions || []
      },
      draft,
      missingFields: missing,
      suggestions: result.suggestions || [],
      source: result.source || "hermes_runtime",
      sessionId: result.sessionId || null
    };
  }

  return { buildResponse };
}
