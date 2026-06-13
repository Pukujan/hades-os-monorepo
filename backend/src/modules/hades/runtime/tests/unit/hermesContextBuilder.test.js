import { test, describe } from "node:test";
import assert from "node:assert/strict";

async function loadModule() {
  try {
    return await import("../../hermesContextBuilder.js");
  } catch (error) {
    throw new Error("Missing hermesContextBuilder.js", { cause: error });
  }
}

describe("buildHermesContext", () => {
  const authContext = {
    userId: "user_a",
    tenantId: "tenant_a",
    sessionId: "session_a",
  };

  const trigger = {
    provider: "discord",
    accountId: "discord_a",
    channelId: "channel_a",
    content: "!catgif",
    triggerType: "command",
  };

  const minion = {
    id: "minion_a",
    user_id: "user_a",
    tenant_id: "tenant_a",
    name: "Cat Courier",
    command_name: "!catgif",
  };

  const assignment = {
    id: "assign_a",
    user_id: "user_a",
    tenant_id: "tenant_a",
    provider: "discord",
    command_name: "!catgif",
  };

  test("builds context with current userId and tenantId", async () => {
    const { buildHermesContext } = await loadModule();
    const context = buildHermesContext({
      authContext,
      trigger,
      minion,
      assignment,
      scopedMemory: [],
      allowedTools: [],
    });

    assert.equal(context.userId, "user_a");
    assert.equal(context.tenantId, "tenant_a");
  });

  test("includes only current user's minion", async () => {
    const { buildHermesContext } = await loadModule();
    const context = buildHermesContext({
      authContext,
      trigger,
      minion,
      assignment,
      scopedMemory: [],
      allowedTools: [],
    });

    assert.equal(context.minion.id, "minion_a");
  });

  test("throws if minion belongs to another user", async () => {
    const { buildHermesContext } = await loadModule();
    assert.throws(
      () =>
        buildHermesContext({
          authContext,
          trigger,
          minion: { ...minion, user_id: "user_b" },
          assignment,
          scopedMemory: [],
          allowedTools: [],
        }),
      { code: "minion_scope_mismatch" }
    );
  });

  test("throws if assignment belongs to another tenant", async () => {
    const { buildHermesContext } = await loadModule();
    assert.throws(
      () =>
        buildHermesContext({
          authContext,
          trigger,
          minion,
          assignment: { ...assignment, tenant_id: "tenant_b" },
          scopedMemory: [],
          allowedTools: [],
        }),
      { code: "assignment_scope_mismatch" }
    );
  });

  test("includes only scoped memory records", async () => {
    const { buildHermesContext } = await loadModule();
    const context = buildHermesContext({
      authContext,
      trigger,
      minion,
      assignment,
      scopedMemory: [
        { id: "mem_a", user_id: "user_a", tenant_id: "tenant_a", content: "A memory" },
      ],
      allowedTools: [],
    });

    assert.equal(context.scopedMemory.length, 1);
    assert.equal(context.scopedMemory[0].content, "A memory");
  });

  test("rejects memory records from another user", async () => {
    const { buildHermesContext } = await loadModule();
    assert.throws(
      () =>
        buildHermesContext({
          authContext,
          trigger,
          minion,
          assignment,
          scopedMemory: [
            { id: "mem_b", user_id: "user_b", tenant_id: "tenant_b", content: "B memory" },
          ],
          allowedTools: [],
        }),
      { code: "memory_scope_mismatch" }
    );
  });

  test("excludes encrypted secrets from prompt context", async () => {
    const { buildHermesContext } = await loadModule();
    const context = buildHermesContext({
      authContext,
      trigger,
      minion,
      assignment,
      scopedMemory: [],
      allowedTools: [],
      socialConnection: {
        provider: "telegram",
        bot_username: "hades_bot",
        encrypted_bot_token: "encrypted-secret",
      },
    });

    const json = JSON.stringify(context);
    assert.ok(!json.includes("encrypted-secret"));
    assert.ok(!json.includes("encrypted_bot_token"));
  });

  test("marks user-provided content as untrusted input", async () => {
    const { buildHermesContext } = await loadModule();
    const context = buildHermesContext({
      authContext,
      trigger,
      minion,
      assignment,
      scopedMemory: [],
      allowedTools: [],
    });

    assert.deepEqual(context.untrustedInput, {
      provider: "discord",
      content: "!catgif",
      channelId: "channel_a",
      triggerType: "command",
    });
  });
});
