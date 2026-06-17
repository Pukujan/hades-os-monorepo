import { createEmptyDraft } from "./hadesData.js";

function inferCategoryFromMinion(minion) {
  if (minion?.category) return minion.category;
  const triggerType = minion?.triggerType || minion?.trigger_type;
  if (triggerType === "automatic" || triggerType === "watcher") return "task";
  const targetSocial = minion?.targetSocial || minion?.target_social;
  if (targetSocial === "discord") return "fun";
  if (targetSocial === "github") return "dev";
  if (targetSocial === "email") return "chat";
  return "task";
}

export function buildForgeEditUrl(minionId) {
  if (!minionId) return "/forge";
  return `/forge?edit=${encodeURIComponent(minionId)}`;
}

export function normalizeSavedMinion(minion) {
  if (!minion) return null;
  return {
    ...minion,
    commandName: minion.commandName || minion.command_name || null,
    targetSocial: minion.targetSocial || minion.target_social || null,
    triggerType: minion.triggerType || minion.trigger_type || null,
    version: minion.version || "1.0.0",
    schemaVersion: minion.schemaVersion || minion.schema_version || "hades.minion.v2",
    metadata: {
      ...(minion.metadata || {}),
      version: minion.version || "1.0.0",
      schemaVersion: minion.schemaVersion || minion.schema_version || "hades.minion.v2",
    },
  };
}

export function buildForgeDraftFromMinion(minion) {
  if (!minion) return createEmptyDraft();

  const commandName = minion.commandName || minion.command_name || null;
  const targetSocial = minion.targetSocial || minion.target_social || null;
  const triggerType = minion.triggerType || minion.trigger_type || null;
  const action = minion.action || minion.instructions || minion.description || null;
  const category = inferCategoryFromMinion(minion);

  const draft = {
    ...createEmptyDraft(),
    name: minion.name || null,
    description: minion.description || action || null,
    category,
    targetSocial,
    triggerType,
    commandName,
    action,
    responseStyle: minion.responseStyle || minion.response_style || "helpful",
    safetyMode: minion.safetyMode || minion.safety_mode || "ask_first",
    testInput: minion.testInput || minion.test_input || null,
    status: "ready_to_test",
  };

  if (!draft.targetSocial && category === "fun") draft.targetSocial = "discord";
  if (!draft.targetSocial && category === "dev") draft.targetSocial = "github";
  if (!draft.targetSocial && category === "chat") draft.targetSocial = "private";
  if (!draft.triggerType && commandName) draft.triggerType = "command";
  if (!draft.triggerType) draft.triggerType = "manual";

  return draft;
}

export function paginateMinions(minions = [], page = 0, pageSize = 10) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 0;
  const safeSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 10;
  const totalPages = Math.max(1, Math.ceil(minions.length / safeSize));
  const currentPage = Math.min(safePage, totalPages - 1);
  const start = currentPage * safeSize;
  return {
    page: currentPage,
    pageSize: safeSize,
    totalPages,
    visibleMinions: minions.slice(start, start + safeSize),
    hasPrevious: currentPage > 0,
    hasNext: currentPage < totalPages - 1,
  };
}

export function getForgeTriggerLabel(draft = {}) {
  if (!draft?.triggerType) return "Not set";

  if (draft.triggerType === "command") {
    return draft.commandName ? `Command · ${draft.commandName}` : "Command";
  }

  if (draft.triggerType === "watcher") return "Watcher";
  if (draft.triggerType === "manual") return "Manual";

  return draft.triggerType.charAt(0).toUpperCase() + draft.triggerType.slice(1);
}

export function getForgeDraftActionLabel({ isEditing = false } = {}) {
  return isEditing ? "Update minion" : "Save minion";
}
