import { apiPost } from "../../shared/api/client.js";
import { createDraftFromMessage } from "./parser.js";
import {
  SOCIAL_LINKS,
  createEmptyDraft,
  createInitialMessages,
  createStarterOwnedMinions,
  deriveLevelState
} from "./hadesData.js";

export async function getHadesBootstrap() {
  const response = await fetch(`${import.meta?.env?.VITE_API_BASE_URL || "http://localhost:3001"}/api/hades/bootstrap`);
  const body = await response.text();
  const parsed = body ? JSON.parse(body) : null;

  if (!response.ok) {
    throw new Error(parsed?.error || parsed?.message || `Request failed: ${response.status}`);
  }

  return parsed;
}

export async function postHadesChat(payload) {
  return apiPost("/api/hades/chat", payload);
}

export async function postHadesMinionTest(payload) {
  return apiPost("/api/hades/minions/test", payload);
}

export async function postHadesMinion(payload) {
  return apiPost("/api/hades/minions", payload);
}

export async function postHadesAssignment(payload) {
  return apiPost("/api/hades/assignments", payload);
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
