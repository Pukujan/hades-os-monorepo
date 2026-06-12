import { test } from "node:test";
import assert from "node:assert/strict";
import { createHadesRepository } from "../../repositories/hades.repository.js";

test("repository supports conversation, messages, minions, assignments, and idempotency", async () => {
  const repo = createHadesRepository({ now: () => "2026-06-10T00:00:00.000Z" });
  const conversation = repo.getOrCreateConversation({ userId: "local-user" });
  assert.ok(conversation.id);

  const msg1 = await repo.appendMessage({
    conversationId: conversation.id,
    idempotencyKey: "msg-1",
    message: { role: "user", content: "hello", status: "queued" }
  });
  const msg2 = await repo.appendMessage({
    conversationId: conversation.id,
    idempotencyKey: "msg-1",
    message: { role: "user", content: "different", status: "queued" }
  });
  assert.equal(msg1.id, msg2.id);
  assert.equal(repo.listMessages(conversation.id).length, 1);

  const testRun = await repo.saveTestRun({
    idempotencyKey: "test-1",
    run: { draftSnapshot: { name: "Task Helper" }, output: "ok", status: "passed" }
  });
  const duplicateTestRun = await repo.saveTestRun({
    idempotencyKey: "test-1",
    run: { draftSnapshot: { name: "Other" }, output: "nope", status: "passed" }
  });
  assert.equal(testRun.id, duplicateTestRun.id);

  const minion = await repo.saveMinion({
    idempotencyKey: "minion-1",
    minion: { name: "Task Helper", commandName: null, targetSocial: "private" }
  });
  assert.equal(repo.getMinion(minion.id).name, "Task Helper");

  const assignment = await repo.saveAssignment({
    idempotencyKey: "assignment-1",
    assignment: { minionId: minion.id, socialLinkId: "discord", status: "active" }
  });
  assert.equal(repo.listAssignments().length, 1);
  assert.equal(assignment.socialLinkId, "discord");
});

test("repository persists Hermes agent execution records with idempotency", async () => {
  const repo = createHadesRepository({ now: () => "2026-06-11T00:00:00.000Z" });
  const conversation = repo.getOrCreateConversation({ userId: "local-user" });

  const execution = await repo.saveAgentExecution({
    idempotencyKey: "agent-1",
    execution: {
      conversationId: conversation.id,
      sessionId: "20260611_runtime",
      source: "hermes_runtime",
      status: "completed",
      errorMessage: null
    }
  });
  const duplicate = await repo.saveAgentExecution({
    idempotencyKey: "agent-1",
    execution: {
      conversationId: conversation.id,
      sessionId: "different",
      source: "hermes_runtime",
      status: "failed",
      errorMessage: "should not replace idempotent record"
    }
  });

  assert.equal(execution.id, duplicate.id);
  assert.equal(duplicate.sessionId, "20260611_runtime");

  const fallbackExecution = await repo.saveAgentExecution({
    idempotencyKey: "agent-2",
    execution: {
      conversationId: conversation.id,
      sessionId: null,
      source: "local_fallback",
      status: "fallback",
      errorMessage: "Hermes runtime returned invalid JSON"
    }
  });

  const snapshot = repo.getSnapshot();
  assert.equal(snapshot.agentExecutions.length, 2);
  assert.equal(snapshot.agentExecutions.some((entry) => entry.id === execution.id), true);
  assert.equal(snapshot.agentExecutions.some((entry) => entry.id === fallbackExecution.id), true);
});
