import { AppError } from "../../shared/http/errors.js";
import { VALID_CATEGORIES, VALID_TARGET_SOCIALS, VALID_TRIGGER_TYPES, missingDraftFields } from "./data.js";

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError(`${label} must be an object`, 400);
  }
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(`${label} is required`, 400);
  }
}

function assertOptionalEnum(value, allowed, label) {
  if (value == null) return;
  if (!allowed.includes(value)) {
    throw new AppError(`Unknown ${label}: ${value}`, 400);
  }
}

export function validateDraft(draft, { requireComplete = false } = {}) {
  assertObject(draft, "draft");

  assertOptionalEnum(draft.category, VALID_CATEGORIES, "category");
  assertOptionalEnum(draft.triggerType, VALID_TRIGGER_TYPES, "triggerType");
  assertOptionalEnum(draft.targetSocial, VALID_TARGET_SOCIALS, "targetSocial");

  if (requireComplete) {
    const missing = missingDraftFields(draft);
    if (missing.length) {
      throw new AppError(`Draft incomplete: ${missing.join(", ")}`, 400);
    }
  }

  return draft;
}

export function validateChatRequest(body) {
  assertObject(body, "request body");
  assertNonEmptyString(body.message, "message");
  assertNonEmptyString(body.clientMessageId, "clientMessageId");
  assertNonEmptyString(body.idempotencyKey, "idempotencyKey");

  if (body.currentDraft) {
    validateDraft(body.currentDraft, { requireComplete: false });
  }

  return {
    conversationId: typeof body.conversationId === "string" && body.conversationId.trim() ? body.conversationId.trim() : null,
    clientMessageId: body.clientMessageId.trim(),
    idempotencyKey: body.idempotencyKey.trim(),
    message: body.message.trim(),
    currentDraft: body.currentDraft || null
  };
}

export function validateTestRequest(body) {
  assertObject(body, "request body");
  assertNonEmptyString(body.idempotencyKey, "idempotencyKey");
  validateDraft(body.draft, { requireComplete: true });

  return {
    draft: body.draft,
    testInput: typeof body.testInput === "string" ? body.testInput : null,
    idempotencyKey: body.idempotencyKey.trim()
  };
}

export function validateSaveRequest(body) {
  assertObject(body, "request body");
  assertNonEmptyString(body.idempotencyKey, "idempotencyKey");
  validateDraft(body.draft, { requireComplete: true });

  return {
    draft: body.draft,
    idempotencyKey: body.idempotencyKey.trim()
  };
}

export function validateAssignmentRequest(body) {
  assertObject(body, "request body");
  assertNonEmptyString(body.idempotencyKey, "idempotencyKey");
  assertNonEmptyString(body.minionId, "minionId");
  assertNonEmptyString(body.socialLinkId, "socialLinkId");

  return {
    minionId: body.minionId.trim(),
    socialLinkId: body.socialLinkId.trim(),
    commandName: typeof body.commandName === "string" && body.commandName.trim() ? body.commandName.trim() : null,
    idempotencyKey: body.idempotencyKey.trim()
  };
}

