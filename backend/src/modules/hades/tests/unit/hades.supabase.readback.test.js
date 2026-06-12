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
          return Promise.resolve({ data: list, error: null });
        },
        upsert(rows) {
          const list = Array.isArray(rows) ? rows : [rows];
          for (const row of list) {
            const idx = tables[name].findIndex((entry) => entry.id === row.id);
            if (idx >= 0) tables[name][idx] = { ...tables[name][idx], ...row };
            else tables[name].push({ ...row });
          }
          return Promise.resolve({ data: list, error: null });
        },
        select() {
          return {
            eq(column, value) {
              return Promise.resolve({
                data: tables[name].filter((row) => row[column] === value).map((row) => ({ ...row })),
                error: null
              });
            }
          };
        }
      };
    }
  };
}

test("Supabase-backed repository can hydrate MVP state from stored rows", async () => {
  const supabaseClient = createFakeSupabaseClient();
  const writer = createHadesRepository({
    storage: "supabase",
    supabaseClient,
    now: () => "2026-06-10T00:00:00.000Z"
  });

  const conversation = writer.getOrCreateConversation({ userId: "local-user" });
  await writer.appendMessage({
    conversationId: conversation.id,
    idempotencyKey: "msg-1",
    message: {
      role: "user",
      content: "Make me a Discord command called !sendcatmeme",
      status: "completed",
      userId: "local-user"
    }
  });
  await writer.saveConversationDraft({
    conversationId: conversation.id,
    draftSnapshot: {
      name: "Cat Meme Minion",
      category: "fun",
      targetSocial: "discord",
      triggerType: "command",
      commandName: "!sendcatmeme",
      action: "send a random cat meme GIF",
      status: "ready_to_test"
    }
  });
  const minion = await writer.saveMinion({
    idempotencyKey: "minion-1",
    minion: {
      userId: "local-user",
      name: "Cat Meme Minion",
      targetSocial: "discord",
      commandName: "!sendcatmeme",
      status: "active"
    }
  });
  const assignment = await writer.saveAssignment({
    idempotencyKey: "assignment-1",
    assignment: {
      userId: "local-user",
      minionId: minion.id,
      socialLinkId: "discord",
      status: "active"
    }
  });
  await writer.saveTestRun({
    idempotencyKey: "test-1",
    run: {
      minionId: minion.id,
      testInput: "!sendcatmeme",
      output: "random cat meme sent.",
      status: "passed"
    }
  });

  const reader = createHadesRepository({
    storage: "supabase",
    supabaseClient,
    now: () => "2026-06-10T00:00:00.000Z"
  });
  const state = await reader.getBootstrapState({
    userId: "local-user",
    conversationId: conversation.id
  });

  assert.equal(state.source, "supabase");
  assert.equal(state.conversationId, conversation.id);
  assert.equal(state.draft.name, "Cat Meme Minion");
  assert.equal(state.messages.some((message) => message.content.includes("Discord command")), true);
  assert.equal(state.minions.some((entry) => entry.id === minion.id), true);
  assert.equal(state.assignments.some((entry) => entry.id === assignment.id), true);
});
