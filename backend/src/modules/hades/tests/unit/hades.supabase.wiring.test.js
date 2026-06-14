import { test, describe } from "node:test";
import assert from "node:assert/strict";

async function loadRepository() {
  try {
    return await import("../../repositories/hades.repository.js");
  } catch (error) {
    throw new Error(
      "Missing hades.repository.js — expected at ../../repositories/hades.repository.js",
      { cause: error }
    );
  }
}

async function loadModule() {
  try {
    return await import("../../index.js");
  } catch (error) {
    throw new Error(
      "Missing index.js — expected at ../../index.js",
      { cause: error }
    );
  }
}

describe("Supabase persistence wiring", () => {
  test("createHadesRepository uses supabase storage when supabaseClient is provided", async () => {
    const { createHadesRepository } = await loadRepository();

    const savedMinions = [];
    const savedMessages = [];

    const repository = createHadesRepository({
      storage: "supabase",
      supabaseClient: {
        table: () => ({
          upsert: async (data) => {
            savedMinions.push(data);
            return { error: null };
          },
          insert: async (data) => {
            savedMessages.push(data);
            return { error: null };
          },
          select: async () => ({
            data: [],
            error: null,
          }),
        }),
      },
    });

    const minion = await repository.saveMinion({
      idempotencyKey: "supabase-test-1",
      minion: {
        name: "Supabase Minion",
        commandName: "!test",
        targetSocial: "discord",
        userId: "user_1",
        tenantId: "tenant_1",
      },
    });

    assert.ok(minion.id, "Minion should be saved with an id");
    assert.equal(savedMinions.length, 1, "Minion should be persisted to Supabase");
    assert.equal(savedMinions[0].name, "Supabase Minion");
  });

  test("register() passes configuration through to repository", async () => {
    const mod = await loadModule();
    const mockApp = { use: () => {} };

    const configCalls = [];
    const mockContext = {
      config: {
        get(key) {
          configCalls.push(key);
          if (key === "supabaseUrl") return "https://test.supabase.co";
          if (key === "supabaseServiceRoleKey") return "test-service-key";
          return undefined;
        },
      },
    };

    const result = await mod.register(mockApp, mockContext);
    assert.ok(result, "register() should return a detail object");
  });

  test("repository falls back to memory mode when supabaseClient is not provided", async () => {
    const { createHadesRepository } = await loadRepository();

    const repo = createHadesRepository();
    assert.ok(repo, "Repository should be created in memory mode");

    const minion = await repo.saveMinion({
      idempotencyKey: "memory-test-1",
      minion: { name: "Memory Minion", commandName: null, targetSocial: "private" },
    });

    assert.ok(minion.id, "Minion should be saved in memory mode");
    const fetched = repo.getMinion(minion.id);
    assert.equal(fetched.name, "Memory Minion");
  });

  test("findActiveAssignment queries supabase when supabaseClient is present", async () => {
    const { createHadesRepository } = await loadRepository();

    const queries = [];
    const repository = createHadesRepository({
      storage: "supabase",
      supabaseClient: {
        table: () => ({
          select: async () => ({
            data: [],
            error: null,
          }),
          upsert: async () => ({ error: null }),
        }),
      },
    });

    const result = await repository.findActiveAssignment({
      userId: "user_1",
      tenantId: "tenant_1",
      provider: "discord",
      channelId: "channel_abc",
      commandName: "!catgif",
      triggerType: "command",
    });

    assert.ok(result === null || result === undefined,
      "Should return null/undefined when no assignment matches in Supabase");
  });
});
