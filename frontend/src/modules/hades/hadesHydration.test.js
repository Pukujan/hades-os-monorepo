import { test } from "node:test";
import assert from "node:assert/strict";

test("bootstrap api calls the backend hydration route", async () => {
  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    calls.push(url);
    return new Response(
      JSON.stringify({
        userId: "local-user",
        conversationId: "conv-1",
        messages: [],
        draft: null,
        minions: [],
        assignments: [],
        socialLinks: [],
        levelState: null,
        source: "memory"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  };

  try {
    const { getHadesBootstrap } = await import("./hadesApi.js");
    await getHadesBootstrap();
    assert.equal(calls[0].endsWith("/api/hades/bootstrap"), true);
  } finally {
    global.fetch = originalFetch;
  }
});

test("bootstrap mapper preserves backend state and fills safe defaults", async () => {
  const { mapBootstrapToHadesState } = await import("./hadesApi.js");
  const state = mapBootstrapToHadesState({
    conversationId: "conv-1",
    messages: [{ id: "m1", role: "assistant", content: "hello", status: "completed" }],
    draft: { name: "Task Helper", status: "ready_to_test" },
    minions: [{ id: "minion-1", name: "Task Helper" }],
    assignments: [{ id: "assignment-1", minionId: "minion-1", socialLinkId: "discord" }],
    socialLinks: [{ id: "discord", provider: "discord" }],
    levelState: { level: 2 },
    source: "supabase"
  });

  assert.equal(state.conversationId, "conv-1");
  assert.equal(state.messages.length, 1);
  assert.equal(state.draft.name, "Task Helper");
  assert.equal(state.minions.length, 1);
  assert.equal(state.assignments.length, 1);
  assert.equal(state.socialLinks.length, 1);
  assert.equal(state.levelState.level, 2);
  assert.equal(state.source, "supabase");

  const fallback = mapBootstrapToHadesState({});
  assert.ok(fallback.messages.length > 0);
  assert.ok(fallback.minions.length > 0);
  assert.equal(fallback.draft.status, "incomplete");
});

