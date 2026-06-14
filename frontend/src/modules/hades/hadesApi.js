import { apiGet, apiPost, apiDelete } from "../../shared/api/client.js";
import { createDraftFromMessage } from "./parser.js";
import {
  SOCIAL_LINKS,
  createEmptyDraft,
  createInitialMessages,
  createStarterOwnedMinions,
  deriveLevelState
} from "./hadesData.js";

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

export function buildLocalDraftFallback(message, currentDraft) {
  return createDraftFromMessage(message, currentDraft);
}

export function mapBootstrapToHadesState(payload = {}) {
  return {
    conversationId: payload.conversationId || null,
    messages: payload.messages?.length ? payload.messages : createInitialMessages(),
    draft: payload.draft || createEmptyDraft(),
    minions: payload.minions?.length ? payload.minions : createStarterOwnedMinions(),
    assignments: payload.assignments || [],
    socialLinks: payload.socialLinks?.length ? payload.socialLinks : SOCIAL_LINKS,
    levelState: payload.levelState || deriveLevelState(payload.minions?.length || createStarterOwnedMinions().length),
    source: payload.source || "local_fallback"
  };
}
