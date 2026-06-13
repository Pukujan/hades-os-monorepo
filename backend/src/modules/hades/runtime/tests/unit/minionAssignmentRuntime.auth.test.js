import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

async function loadModule() {
  try {
    return await import("../../minionAssignmentRuntime.js");
  } catch (error) {
    throw new Error("Missing minionAssignmentRuntime.js", { cause: error });
  }
}

describe("minionAssignmentRuntime auth isolation", () => {
  let verifySocialAccount;
  let assignmentRepository;
  let minionRepository;
  let hermesRuntime;
  let socialClient;
  let executionRepository;
  let runtime;

  beforeEach(async () => {
    const mod = await loadModule();

    verifySocialAccount = async () => ({ ok: false, code: "unknown_social_account" });

    assignmentRepository = {
      findActiveAssignment: async () => null,
    };

    minionRepository = {
      findById: async () => null,
    };

    hermesRuntime = {
      executeMinion: async () => ({}),
    };

    socialClient = {
      sendMessage: async () => ({ ok: true }),
    };

    executionRepository = {
      create: async () => ({}),
    };

    runtime = mod.createMinionAssignmentRuntime({
      verifySocialAccount,
      assignmentRepository,
      minionRepository,
      hermesRuntime,
      socialClient,
      executionRepository,
    });
  });

  test("rejects trigger when verifySocialAccount returns ok false", async () => {
    const result = await runtime.handleSocialTrigger({
      provider: "discord",
      accountId: "discord_missing",
      content: "!catgif",
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, "unknown_social_account");
  });

  test("rejects trigger for inactive connection", async () => {
    verifySocialAccount = async () => ({ ok: false, code: "inactive_connection" });

    const mod = await loadModule();
    runtime = mod.createMinionAssignmentRuntime({
      verifySocialAccount,
      assignmentRepository,
      minionRepository,
      hermesRuntime,
      socialClient,
      executionRepository,
    });

    const result = await runtime.handleSocialTrigger({
      provider: "telegram",
      accountId: "tg_123",
      content: "/catgif",
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, "inactive_connection");
  });

  test("finds assignment only under verified userId", async () => {
    verifySocialAccount = async () => ({
      provider: "discord",
      connectionId: "conn_a",
      userId: "user_a",
      tenantId: "tenant_a",
    });

    let capturedArgs = null;
    assignmentRepository.findActiveAssignment = async (args) => {
      capturedArgs = args;
      return null;
    };

    const mod = await loadModule();
    runtime = mod.createMinionAssignmentRuntime({
      verifySocialAccount,
      assignmentRepository,
      minionRepository,
      hermesRuntime,
      socialClient,
      executionRepository,
    });

    await runtime.handleSocialTrigger({
      provider: "discord",
      accountId: "discord_a",
      content: "!catgif",
      commandName: "!catgif",
    });

    assert.deepEqual(capturedArgs, {
      userId: "user_a",
      tenantId: "tenant_a",
      provider: "discord",
      commandName: "!catgif",
    });
  });

  test("does not execute when no assigned minion exists", async () => {
    verifySocialAccount = async () => ({
      provider: "discord",
      connectionId: "conn_a",
      userId: "user_a",
      tenantId: "tenant_a",
    });

    const mod = await loadModule();
    runtime = mod.createMinionAssignmentRuntime({
      verifySocialAccount,
      assignmentRepository,
      minionRepository,
      hermesRuntime,
      socialClient,
      executionRepository,
    });

    const result = await runtime.handleSocialTrigger({
      provider: "discord",
      accountId: "discord_a",
      content: "!missing",
      commandName: "!missing",
    });

    assert.deepEqual(result, { ok: false, code: "no_assigned_minion" });
  });

  test("does not execute another user's minion", async () => {
    verifySocialAccount = async () => ({
      provider: "discord",
      connectionId: "conn_a",
      userId: "user_a",
      tenantId: "tenant_a",
    });

    assignmentRepository.findActiveAssignment = async () => ({
      id: "assign_a",
      user_id: "user_a",
      tenant_id: "tenant_a",
      minion_id: "minion_b",
      provider: "discord",
      command_name: "!catgif",
    });

    minionRepository.findById = async () => null;

    const mod = await loadModule();
    runtime = mod.createMinionAssignmentRuntime({
      verifySocialAccount,
      assignmentRepository,
      minionRepository,
      hermesRuntime,
      socialClient,
      executionRepository,
    });

    const result = await runtime.handleSocialTrigger({
      provider: "discord",
      accountId: "discord_a",
      content: "!catgif",
      commandName: "!catgif",
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, "minion_not_found");
  });

  test("passes scoped context to Hermes", async () => {
    verifySocialAccount = async () => ({
      provider: "discord",
      connectionId: "conn_a",
      userId: "user_a",
      tenantId: "tenant_a",
    });

    assignmentRepository.findActiveAssignment = async () => ({
      id: "assign_a",
      user_id: "user_a",
      tenant_id: "tenant_a",
      minion_id: "minion_a",
      provider: "discord",
      command_name: "!catgif",
    });

    minionRepository.findById = async () => ({
      id: "minion_a",
      user_id: "user_a",
      tenant_id: "tenant_a",
      name: "Cat Courier",
    });

    let capturedContext = null;
    hermesRuntime.executeMinion = async (args) => {
      capturedContext = args.context;
      return {
        outboundActions: [{ type: "send_message", content: "cat gif" }],
      };
    };

    const mod = await loadModule();
    runtime = mod.createMinionAssignmentRuntime({
      verifySocialAccount,
      assignmentRepository,
      minionRepository,
      hermesRuntime,
      socialClient,
      executionRepository,
    });

    await runtime.handleSocialTrigger({
      provider: "discord",
      accountId: "discord_a",
      channelId: "channel_a",
      content: "!catgif",
      commandName: "!catgif",
    });

    assert.equal(capturedContext.userId, "user_a");
    assert.equal(capturedContext.tenantId, "tenant_a");
  });

  test("sends outbound action only through verified connection", async () => {
    verifySocialAccount = async () => ({
      provider: "telegram",
      connectionId: "tg_conn_a",
      userId: "user_a",
      tenantId: "tenant_a",
    });

    assignmentRepository.findActiveAssignment = async () => ({
      id: "assign_a",
      user_id: "user_a",
      tenant_id: "tenant_a",
      minion_id: "minion_a",
      provider: "telegram",
      command_name: "/catgif",
    });

    minionRepository.findById = async () => ({
      id: "minion_a",
      user_id: "user_a",
      tenant_id: "tenant_a",
      name: "Cat Courier",
    });

    hermesRuntime.executeMinion = async () => ({
      outboundActions: [{ type: "send_message", content: "cat gif" }],
    });

    let capturedSend = null;
    socialClient.sendMessage = async (args) => {
      capturedSend = args;
      return { ok: true };
    };

    const mod = await loadModule();
    runtime = mod.createMinionAssignmentRuntime({
      verifySocialAccount,
      assignmentRepository,
      minionRepository,
      hermesRuntime,
      socialClient,
      executionRepository,
    });

    await runtime.handleSocialTrigger({
      provider: "telegram",
      accountId: "tg_a",
      channelId: "chat_a",
      content: "/catgif",
      commandName: "/catgif",
    });

    assert.equal(capturedSend.provider, "telegram");
    assert.equal(capturedSend.connectionId, "tg_conn_a");
    assert.equal(capturedSend.channelId, "chat_a");
    assert.equal(capturedSend.content, "cat gif");
  });

  test("returns social_send_failed when outbound send fails", async () => {
    verifySocialAccount = async () => ({
      provider: "discord",
      connectionId: "conn_a",
      userId: "user_a",
      tenantId: "tenant_a",
    });

    assignmentRepository.findActiveAssignment = async () => ({
      id: "assign_a",
      user_id: "user_a",
      tenant_id: "tenant_a",
      minion_id: "minion_a",
      provider: "discord",
      command_name: "!catgif",
    });

    minionRepository.findById = async () => ({
      id: "minion_a",
      user_id: "user_a",
      tenant_id: "tenant_a",
      name: "Cat Courier",
    });

    hermesRuntime.executeMinion = async () => ({
      outboundActions: [{ type: "send_message", content: "cat gif" }],
    });

    socialClient.sendMessage = async () => ({ ok: false });

    const mod = await loadModule();
    runtime = mod.createMinionAssignmentRuntime({
      verifySocialAccount,
      assignmentRepository,
      minionRepository,
      hermesRuntime,
      socialClient,
      executionRepository,
    });

    const result = await runtime.handleSocialTrigger({
      provider: "discord",
      accountId: "discord_a",
      channelId: "channel_a",
      content: "!catgif",
      commandName: "!catgif",
    });

    assert.deepEqual(result, { ok: false, code: "social_send_failed" });
  });
});
