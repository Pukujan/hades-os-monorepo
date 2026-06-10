import { createDraftFromMessage, buildAssistantReply, sanitizeAssistantText } from "../parser.js";
import { createEmptyDraft, missingDraftFields, VALID_CATEGORIES, VALID_TARGET_SOCIALS, VALID_TRIGGER_TYPES } from "../data.js";

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

export function createHermesService({ config = {}, privateAiClient = null } = {}) {
  async function buildResponse({ userId = "local-user", conversationId, message, currentDraft = createEmptyDraft() }) {
    const allowPrivateAi = Boolean(config.privateAiBaseUrl && config.privateAiApiKey);

    if (allowPrivateAi && privateAiClient?.generateDraft) {
      try {
        const remote = await privateAiClient.generateDraft({
          userId,
          conversationId,
          message,
          currentDraft,
          allowedProviders: VALID_TARGET_SOCIALS,
          mode: "minion_draft"
        });

        if (
          !isValidEnum(remote?.draftPatch?.category, VALID_CATEGORIES) ||
          !isValidEnum(remote?.draftPatch?.triggerType, VALID_TRIGGER_TYPES) ||
          !isValidEnum(remote?.draftPatch?.targetSocial, VALID_TARGET_SOCIALS)
        ) {
          throw new Error("Invalid draft patch from private AI");
        }

        const draft = normalizePatch(currentDraft, remote.draftPatch || {});
        const missing = remote.missingFields?.length ? remote.missingFields : missingDraftFields(draft);
        draft.status = missing.length ? "incomplete" : "ready_to_test";

        return {
          assistantMessage: {
            role: "assistant",
            content: sanitizeAssistantText(remote.assistantText || "Draft updated."),
            status: "completed",
            suggestions: remote.suggestions || []
          },
          draft,
          missingFields: missing,
          suggestions: remote.suggestions || [],
          source: "private_ai"
        };
      } catch (error) {
        if (error?.status && error.status < 500) {
          throw error;
        }
      }
    }

    const parsed = createDraftFromMessage(message, currentDraft);
    const assistantReply = buildAssistantReply(parsed);

    return {
      assistantMessage: {
        role: "assistant",
        content: sanitizeAssistantText(assistantReply.content),
        status: assistantReply.status,
        suggestions: assistantReply.suggestions || []
      },
      draft: parsed.draft,
      missingFields: parsed.missing,
      suggestions: assistantReply.suggestions || [],
      source: "local_fallback"
    };
  }

  return { buildResponse };
}

