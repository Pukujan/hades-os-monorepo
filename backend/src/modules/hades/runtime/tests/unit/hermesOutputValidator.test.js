import { test, describe } from "node:test";
import assert from "node:assert/strict";

async function loadModule() {
  try {
    return await import("../../hermesOutputValidator.js");
  } catch (error) {
    throw new Error("Missing hermesOutputValidator.js", { cause: error });
  }
}

describe("validateHermesOutput", () => {
  const authContext = {
    userId: "user_a",
    tenantId: "tenant_a",
  };

  const assignment = {
    id: "assign_a",
    user_id: "user_a",
    tenant_id: "tenant_a",
    provider: "discord",
    channel_id: "channel_a",
  };

  test("accepts valid outboundActions array", async () => {
    const { validateHermesOutput } = await loadModule();
    const result = validateHermesOutput({
      output: {
        outboundActions: [
          { type: "send_message", content: "hello" },
        ],
      },
      authContext,
      assignment,
      allowedActions: ["send_message"],
    });

    assert.equal(result.ok, true);
  });

  test("rejects unknown action type", async () => {
    const { validateHermesOutput } = await loadModule();
    const result = validateHermesOutput({
      output: {
        outboundActions: [
          { type: "delete_database", table: "users" },
        ],
      },
      authContext,
      assignment,
      allowedActions: ["send_message"],
    });

    assert.deepEqual(result, {
      ok: false,
      code: "invalid_hermes_output",
      reason: "unknown_action_type",
    });
  });

  test("rejects missing required fields", async () => {
    const { validateHermesOutput } = await loadModule();
    const result = validateHermesOutput({
      output: {
        outboundActions: [
          { type: "send_message" },
        ],
      },
      authContext,
      assignment,
      allowedActions: ["send_message"],
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "missing_content");
  });

  test("rejects action using unauthorized provider", async () => {
    const { validateHermesOutput } = await loadModule();
    const result = validateHermesOutput({
      output: {
        outboundActions: [
          { type: "send_message", provider: "telegram", content: "hello" },
        ],
      },
      authContext,
      assignment,
      allowedActions: ["send_message"],
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "provider_mismatch");
  });

  test("rejects action targeting another user's channel", async () => {
    const { validateHermesOutput } = await loadModule();
    const result = validateHermesOutput({
      output: {
        outboundActions: [
          { type: "send_message", channelId: "channel_b", content: "hello" },
        ],
      },
      authContext,
      assignment,
      allowedActions: ["send_message"],
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "channel_mismatch");
  });

  test("rejects raw shell/file action unless explicitly allowed", async () => {
    const { validateHermesOutput } = await loadModule();
    const result = validateHermesOutput({
      output: {
        outboundActions: [
          { type: "run_shell", command: "rm -rf /" },
        ],
      },
      authContext,
      assignment,
      allowedActions: ["send_message"],
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "unknown_action_type");
  });

  test("rejects output with unexpected secret fields", async () => {
    const { validateHermesOutput } = await loadModule();
    const result = validateHermesOutput({
      output: {
        outboundActions: [
          {
            type: "send_message",
            content: "hello",
            encrypted_bot_token: "secret",
          },
        ],
      },
      authContext,
      assignment,
      allowedActions: ["send_message"],
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "secret_field_detected");
  });
});
