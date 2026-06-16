import { apiGet, apiPost, apiPatch, apiDelete } from "../../../shared/api/client.js";
import { createDraftFromMessage } from "../utils/parser.js";
import {
  SOCIAL_LINKS,
  createEmptyDraft,
  createInitialMessages
} from "../utils/hadesData.js";

export async function sendHadesChatMessage({
  mode = "general",
  message,
  conversationId,
  idempotencyKey,
  clientMessageId,
  currentDraft
} = {}, accessToken) {
  return apiPost(`/api/hades/chat/${mode}`, {
    clientMessageId: clientMessageId || idempotencyKey,
    idempotencyKey,
    message,
    conversationId: conversationId || null,
    currentDraft: currentDraft || null,
  }, { accessToken });
}

export async function getHadesBootstrap(accessToken) {
  return apiGet("/api/hades/bootstrap", { accessToken });
}

export async function postHadesChat(payload, accessToken) {
  return apiPost("/api/hades/chat", payload, { accessToken });
}

export async function sendGeneralChat({ message, conversationId, idempotencyKey, clientMessageId, currentDraft } = {}, accessToken) {
  return apiPost("/api/hades/chat/general", {
    clientMessageId: clientMessageId || idempotencyKey,
    idempotencyKey,
    message,
    conversationId: conversationId || null,
    currentDraft: currentDraft || null,
  }, { accessToken });
}

export async function sendForgeChat({ message, conversationId, idempotencyKey, clientMessageId, currentDraft } = {}, accessToken) {
  return apiPost("/api/hades/chat/forge", {
    clientMessageId: clientMessageId || idempotencyKey,
    idempotencyKey,
    message,
    conversationId: conversationId || null,
    currentDraft: currentDraft || null,
  }, { accessToken });
}

export async function postHadesMinionTest(payload, accessToken) {
  return apiPost("/api/hades/minions/test", payload, { accessToken });
}

export async function postHadesMinion(payload, accessToken) {
  return apiPost("/api/hades/minions", payload, { accessToken });
}

export async function postHadesAssignment(payload, accessToken) {
  return apiPost("/api/hades/assignments", payload, { accessToken });
}

export async function deleteHadesMessages(conversationId, accessToken) {
  return apiDelete(`/api/hades/conversations/${conversationId}/messages`, null, { accessToken });
}

export async function saveTelegramToken({ token }, accessToken) {
  return apiPost("/api/hades/socials/telegram/token", { token }, { accessToken });
}

export async function saveDiscordToken({ token }, accessToken) {
  return apiPost("/api/hades/socials/discord/token", { token }, { accessToken });
}

export async function saveGitHubToken({ token }, accessToken) {
  return apiPost("/api/hades/socials/github/token", { token }, { accessToken });
}

export async function getMinion(minionId, accessToken) {
  return apiGet(`/api/hades/minions/${minionId}`, { accessToken });
}

export async function listMinions(accessToken) {
  return apiGet("/api/hades/minions", { accessToken });
}

export async function getMinionLogs(minionId, accessToken) {
  return apiGet(`/api/hades/minions/${minionId}/logs`, { accessToken });
}

export async function getNotifications(accessToken) {
  return apiGet("/api/hades/notifications", { accessToken });
}

export async function markNotificationRead(notificationId, accessToken) {
  return apiPatch(`/api/hades/notifications/${notificationId}/read`, {}, { accessToken });
}

export async function markAllNotificationsRead(accessToken) {
  return apiPatch("/api/hades/notifications/read-all", {}, { accessToken });
}

export async function updateMinion(minionId, updates, accessToken) {
  return apiPatch(`/api/hades/minions/${minionId}`, updates, { accessToken });
}

export async function deleteMinion(minionId, accessToken) {
  return apiDelete(`/api/hades/minions/${minionId}`, null, { accessToken });
}

export async function generateCatMeme(promptOrOptions, accessToken) {
  const payload = typeof promptOrOptions === "string"
    ? { prompt: promptOrOptions }
    : { templateId: promptOrOptions?.templateId, text: promptOrOptions?.text };
  return apiPost("/api/hades/catmeme/generate", payload, { accessToken });
}

export async function getCatMemeTemplates(accessToken) {
  return apiGet("/api/hades/catmeme/templates", { accessToken });
}

export function buildLocalDraftFallback(message, currentDraft) {
  return createDraftFromMessage(message, currentDraft);
}

export function mapBootstrapToHadesState(payload = {}) {
  return {
    conversationId: payload.conversationId || null,
    messages: payload.messages?.length ? payload.messages : createInitialMessages(),
    draft: payload.draft || createEmptyDraft(),
    minions: payload.minions?.length ? payload.minions : [],
    assignments: payload.assignments || [],
    socialLinks: payload.socialLinks?.length ? payload.socialLinks : SOCIAL_LINKS,
    levelState: payload.levelState || null,
    source: payload.source || "local_fallback"
  };
}
