import { apiPost } from "../../shared/api/client.js";
import { createDraftFromMessage } from "./parser.js";

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

