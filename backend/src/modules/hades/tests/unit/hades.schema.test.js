import { test } from "node:test";
import assert from "node:assert/strict";
import { validateAssignmentRequest, validateChatRequest, validateDraft, validateSaveRequest, validateTestRequest } from "../../validators.js";
import { createEmptyDraft } from "../../data.js";

test("valid chat request passes", () => {
  const payload = validateChatRequest({
    clientMessageId: "msg-1",
    idempotencyKey: "idem-1",
    message: "Make a task helper",
    currentDraft: createEmptyDraft()
  });

  assert.equal(payload.message, "Make a task helper");
});

test("empty message fails", () => {
  assert.throws(() =>
    validateChatRequest({
      clientMessageId: "msg-1",
      idempotencyKey: "idem-1",
      message: " "
    })
  );
});

test("missing idempotencyKey fails on write routes", () => {
  assert.throws(() => validateTestRequest({ draft: createEmptyDraft() }));
  assert.throws(() => validateSaveRequest({ draft: createEmptyDraft() }));
  assert.throws(() => validateAssignmentRequest({ minionId: "m1", socialLinkId: "discord" }));
});

test("unknown enum values fail", () => {
  assert.throws(() =>
    validateDraft({
      ...createEmptyDraft(),
      category: "invalid",
      triggerType: "manual",
      targetSocial: "discord"
    })
  );
  assert.throws(() =>
    validateDraft({
      ...createEmptyDraft(),
      category: "task",
      triggerType: "invalid",
      targetSocial: "discord"
    })
  );
  assert.throws(() =>
    validateDraft({
      ...createEmptyDraft(),
      category: "task",
      triggerType: "manual",
      targetSocial: "invalid"
    })
  );
});

test("valid complete draft passes", () => {
  const draft = validateDraft(
    {
      name: "Task Helper",
      description: "Turns messy notes into clean task cards.",
      category: "task",
      targetSocial: "private",
      triggerType: "manual",
      commandName: null,
      action: "turn messy instructions into simple task cards",
      responseStyle: "helpful",
      safetyMode: "ask_first",
      testInput: null,
      status: "ready_to_test"
    },
    { requireComplete: true }
  );

  assert.equal(draft.name, "Task Helper");
});

test("incomplete draft reports missing fields deterministically", () => {
  const draft = createEmptyDraft();
  const result = validateDraft(draft);
  assert.equal(result.name, null);
});

