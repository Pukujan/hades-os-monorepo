import { test } from "node:test";
import assert from "node:assert/strict";
import { createHadesRepository } from "../../repositories/hades.repository.js";

test("repository bootstrap returns default MVP state from empty storage", () => {
  const repo = createHadesRepository({ now: () => "2026-06-10T00:00:00.000Z" });
  const state = repo.getBootstrapState({ userId: "local-user" });

  assert.equal(state.userId, "local-user");
  assert.ok(state.conversationId);
  assert.equal(state.messages.length, 1);
  assert.equal(state.messages[0].role, "assistant");
  assert.equal(state.draft.status, "incomplete");
  assert.equal(state.minions.length, 1);
  assert.equal(state.assignments.length, 0);
  assert.ok(state.socialLinks.some((entry) => entry.id === "discord"));
  assert.equal(state.levelState.level, 1);
  assert.equal(state.source, "memory");
});

test("repository bootstrap returns saved minions and assignments", async () => {
  const repo = createHadesRepository({ now: () => "2026-06-10T00:00:00.000Z" });
  const conversation = repo.getOrCreateConversation({ userId: "local-user" });

  await repo.appendMessage({
    conversationId: conversation.id,
    idempotencyKey: "msg-1",
    message: { role: "user", content: "hello", status: "completed", userId: "local-user" }
  });

  const minion = await repo.saveMinion({
    idempotencyKey: "minion-1",
    minion: {
      userId: "local-user",
      name: "Task Helper",
      description: "Turns messy notes into clean task cards.",
      instructions: "turn messy notes into clean task cards",
      category: "task",
      targetSocial: "private",
      triggerType: "manual",
      status: "active"
    }
  });

  await repo.saveAssignment({
    idempotencyKey: "assignment-1",
    assignment: {
      userId: "local-user",
      minionId: minion.id,
      socialLinkId: "discord",
      scope: "social",
      commandName: "!task",
      status: "active"
    }
  });

  const state = repo.getBootstrapState({ userId: "local-user", conversationId: conversation.id });

  assert.equal(state.conversationId, conversation.id);
  assert.equal(state.messages.length, 1);
  assert.equal(state.minions.some((entry) => entry.id === minion.id), true);
  assert.equal(state.assignments.length, 1);
  assert.equal(state.levelState.level, 2);
});

