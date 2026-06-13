import { test } from "node:test";
import assert from "node:assert/strict";

async function loadRuntimeFactory() {
  try {
    return await import("../../services/minionAssignmentRuntime.service.js");
  } catch (error) {
    throw new Error(
      [
        "Missing minion assignment runtime.",
        "Implement backend/src/modules/hades/services/minionAssignmentRuntime.service.js",
        "and export createMinionAssignmentRuntime."
      ].join(" "),
      { cause: error }
    );
  }
}

function createSession(overrides = {}) {
  return {
    userId: "user_123",
    tenantId: "tenant_personal_user_123",
    provider: "discord",
    discordAccountId: "discord_456",
    role: "authenticated",
    ...overrides
  };
}

function createMinion(overrides = {}) {
  return {
    id: "minion_catgif",
    userId: "user_123",
    tenantId: "tenant_personal_user_123",
    name: "Cat GIF Minion",
    description: "Sends biochemical cat meme GIFs.",
    category: "fun",
    triggerType: "command",
    commandName: "!catgif",
    targetSocial: "discord",
    instructions: "Search for one safe biochemical cat meme GIF and send it.",
    runtimeSpec: {
      schemaVersion: "hades.minion.v1",
      allowedActions: ["send_gif"]
    },
    status: "active",
    ...overrides
  };
}

function createAssignment(overrides = {}) {
  return {
    id: "assignment_catgif_discord",
    userId: "user_123",
    tenantId: "tenant_personal_user_123",
    minionId: "minion_catgif",
    provider: "discord",
    socialLinkId: "discord",
    channelId: "channel_abc",
    commandName: "!catgif",
    triggerType: "command",
    status: "active",
    ...overrides
  };
}

test("saved minion assignment executes from a later Discord command without recreating the minion", async () => {
  const { createMinionAssignmentRuntime } = await loadRuntimeFactory();
  assert.equal(typeof createMinionAssignmentRuntime, "function");

  const hermesRequests = [];
  const savedExecutions = [];
  const savedMinions = [];
  const sentMessages = [];
  const minion = createMinion();
  const assignment = createAssignment();

  const runtime = createMinionAssignmentRuntime({
    verifySocialAccount: async ({ provider, accountId }) => {
      assert.equal(provider, "discord");
      assert.equal(accountId, "discord_456");
      return createSession();
    },
    repository: {
      async findActiveAssignment(query) {
        assert.deepEqual(query, {
          userId: "user_123",
          tenantId: "tenant_personal_user_123",
          provider: "discord",
          channelId: "channel_abc",
          commandName: "!catgif",
          triggerType: "command"
        });
        return assignment;
      },
      async getMinion(id) {
        assert.equal(id, "minion_catgif");
        return minion;
      },
      async saveAgentExecution({ execution }) {
        savedExecutions.push(execution);
        return { id: "agentexec_runtime_1", ...execution };
      },
      async saveMinion({ minion: nextMinion }) {
        savedMinions.push(nextMinion);
        return nextMinion;
      }
    },
    hermesRuntime: {
      async executeMinion(request) {
        hermesRequests.push(request);
        return {
          assistantText: "Here is one biochemical cat GIF.",
          sessionId: "hermes-runtime-session-1",
          outboundActions: [
            {
              type: "send_message",
              content: "Here is one biochemical cat GIF.",
              mediaUrl: "https://media.example/biochem-cat.gif"
            }
          ],
          safety: { allowed: true }
        };
      }
    },
    socialClient: {
      async sendMessage(request) {
        sentMessages.push(request);
        return { providerMessageId: "discord-message-runtime-1" };
      }
    }
  });

  const result = await runtime.handleSocialTrigger({
    provider: "discord",
    accountId: "discord_456",
    channelId: "channel_abc",
    messageId: "discord-incoming-1",
    content: "!catgif",
    triggerType: "command"
  });

  assert.equal(result.status, "sent");
  assert.equal(result.minionId, "minion_catgif");
  assert.equal(hermesRequests.length, 1);
  assert.equal(hermesRequests[0].context.userId, "user_123");
  assert.equal(hermesRequests[0].minion.id, "minion_catgif");
  assert.equal(hermesRequests[0].assignment.id, "assignment_catgif_discord");
  assert.equal(hermesRequests[0].trigger.commandName, "!catgif");
  assert.equal(savedMinions.length, 0);
  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0].channelId, "channel_abc");
  assert.equal(savedExecutions.length, 1);
  assert.equal(savedExecutions[0].minionId, "minion_catgif");
  assert.equal(savedExecutions[0].assignmentId, "assignment_catgif_discord");
});

test("cross-user command collisions do not execute another user's assignment", async () => {
  const { createMinionAssignmentRuntime } = await loadRuntimeFactory();
  let hermesCalls = 0;

  const runtime = createMinionAssignmentRuntime({
    verifySocialAccount: async () =>
      createSession({
        userId: "user_attacker",
        tenantId: "tenant_personal_user_attacker",
        discordAccountId: "discord_attacker"
      }),
    repository: {
      async findActiveAssignment(query) {
        assert.equal(query.userId, "user_attacker");
        assert.equal(query.tenantId, "tenant_personal_user_attacker");
        return null;
      },
      async getMinion() {
        throw new Error("minion lookup should not run without an active assignment");
      },
      async saveAgentExecution() {}
    },
    hermesRuntime: {
      async executeMinion() {
        hermesCalls += 1;
      }
    },
    socialClient: {
      async sendMessage() {
        throw new Error("Discord send should not run without an active assignment");
      }
    }
  });

  const result = await runtime.handleSocialTrigger({
    provider: "discord",
    accountId: "discord_attacker",
    channelId: "channel_abc",
    messageId: "discord-incoming-2",
    content: "!catgif",
    triggerType: "command"
  });

  assert.equal(result.status, "unassigned");
  assert.equal(hermesCalls, 0);
});

test("unassigned commands return an inactive result before Hermes", async () => {
  const { createMinionAssignmentRuntime } = await loadRuntimeFactory();
  let hermesCalls = 0;

  const runtime = createMinionAssignmentRuntime({
    verifySocialAccount: async () => createSession(),
    repository: {
      async findActiveAssignment() {
        return null;
      },
      async getMinion() {
        throw new Error("minion lookup should not run for unassigned commands");
      },
      async saveAgentExecution() {}
    },
    hermesRuntime: {
      async executeMinion() {
        hermesCalls += 1;
      }
    },
    socialClient: {
      async sendMessage() {
        throw new Error("social send should not run for unassigned commands");
      }
    }
  });

  const result = await runtime.handleSocialTrigger({
    provider: "discord",
    accountId: "discord_456",
    channelId: "channel_abc",
    messageId: "discord-incoming-3",
    content: "!unknown",
    triggerType: "command"
  });

  assert.equal(result.status, "unassigned");
  assert.equal(result.reason, "no_active_assignment");
  assert.equal(hermesCalls, 0);
});

test("automation triggers use the same minion runtime shape without Discord command text", async () => {
  const { createMinionAssignmentRuntime } = await loadRuntimeFactory();
  const hermesRequests = [];
  const minion = createMinion({
    id: "minion_daily_digest",
    category: "chat",
    triggerType: "schedule",
    commandName: null,
    targetSocial: "discord",
    instructions: "Post a short daily channel digest."
  });
  const assignment = createAssignment({
    id: "assignment_daily_digest",
    minionId: "minion_daily_digest",
    commandName: null,
    triggerType: "schedule"
  });

  const runtime = createMinionAssignmentRuntime({
    verifySocialAccount: async () => createSession(),
    repository: {
      async findActiveAssignment(query) {
        assert.deepEqual(query, {
          userId: "user_123",
          tenantId: "tenant_personal_user_123",
          provider: "discord",
          channelId: "channel_abc",
          commandName: null,
          triggerType: "schedule"
        });
        return assignment;
      },
      async getMinion(id) {
        assert.equal(id, "minion_daily_digest");
        return minion;
      },
      async saveAgentExecution() {
        return { id: "agentexec_schedule_1" };
      }
    },
    hermesRuntime: {
      async executeMinion(request) {
        hermesRequests.push(request);
        return {
          assistantText: "Daily digest posted.",
          sessionId: "hermes-schedule-session-1",
          outboundActions: [
            {
              type: "send_message",
              content: "Daily digest posted."
            }
          ],
          safety: { allowed: true }
        };
      }
    },
    socialClient: {
      async sendMessage() {
        return { providerMessageId: "discord-schedule-message-1" };
      }
    }
  });

  const result = await runtime.handleSocialTrigger({
    provider: "discord",
    accountId: "discord_456",
    channelId: "channel_abc",
    triggerType: "schedule",
    scheduleId: "daily-9am"
  });

  assert.equal(result.status, "sent");
  assert.equal(result.minionId, "minion_daily_digest");
  assert.equal(hermesRequests.length, 1);
  assert.equal(hermesRequests[0].trigger.triggerType, "schedule");
  assert.equal(hermesRequests[0].trigger.commandName, null);
});

