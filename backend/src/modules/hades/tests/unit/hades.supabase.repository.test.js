import { test } from "node:test";
import assert from "node:assert/strict";
import { createHadesRepository } from "../../repositories/hades.repository.js";

function createFakeSupabaseClient() {
  const tables = {
    conversations: [],
    chat_messages: [],
    minions: [],
    minion_assignments: [],
    minion_test_runs: []
  };

  return {
    tables,
    table(name) {
      if (!tables[name]) {
        throw new Error(`Unknown table: ${name}`);
      }
      return {
        insert(rows) {
          const list = Array.isArray(rows) ? rows : [rows];
          tables[name].push(...list.map((row) => ({ ...row })));
          return Promise.resolve(list);
        },
        upsert(rows) {
          const list = Array.isArray(rows) ? rows : [rows];
          for (const row of list) {
            const idx = tables[name].findIndex((entry) => entry.id === row.id);
            if (idx >= 0) tables[name][idx] = { ...tables[name][idx], ...row };
            else tables[name].push({ ...row });
          }
          return Promise.resolve(list);
        },
        select() {
          return {
            eq(column, value) {
              const rows = tables[name].filter((row) => row[column] === value);
              return Promise.resolve(rows);
            }
          };
        }
      };
    }
  };
}

test("Supabase-backed repository persists the MVP contract", async () => {
  const supabaseClient = createFakeSupabaseClient();
  const repo = createHadesRepository({
    storage: "supabase",
    supabaseClient,
    now: () => "2026-06-10T00:00:00.000Z"
  });

  const conversation = repo.getOrCreateConversation({ userId: "local-user" });
  assert.ok(conversation.id);
  assert.equal(supabaseClient.tables.conversations.length, 1);

  const message = await repo.appendMessage({
    conversationId: conversation.id,
    idempotencyKey: "msg-1",
    message: {
      role: "user",
      content: "hello",
      status: "queued",
      userId: "local-user"
    }
  });
  assert.equal(message.conversationId, conversation.id);
  assert.equal(supabaseClient.tables.chat_messages.length, 1);

  const draft = await repo.saveConversationDraft({
    conversationId: conversation.id,
    draftSnapshot: { name: "Task Helper" }
  });
  assert.equal(draft.draftSnapshot.name, "Task Helper");

  const minion = await repo.saveMinion({
    idempotencyKey: "minion-1",
    minion: { name: "Task Helper", targetSocial: "private" }
  });
  assert.equal(supabaseClient.tables.minions.length, 1);
  assert.equal(minion.name, "Task Helper");

  const testRun = await repo.saveTestRun({
    idempotencyKey: "test-1",
    run: { minionId: minion.id, testInput: "hello", output: "ok", status: "passed" }
  });
  assert.equal(supabaseClient.tables.minion_test_runs.length, 1);
  assert.equal(testRun.output, "ok");

  const assignment = await repo.saveAssignment({
    idempotencyKey: "assignment-1",
    assignment: { minionId: minion.id, socialLinkId: "discord", status: "active" }
  });
  assert.equal(supabaseClient.tables.minion_assignments.length, 1);
  assert.equal(assignment.socialLinkId, "discord");
});
