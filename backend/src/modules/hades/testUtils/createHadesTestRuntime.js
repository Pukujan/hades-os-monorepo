import { createMinionRepository } from "../repositories/minionRepository.js";
import { createAssignmentRepository } from "../repositories/assignmentRepository.js";
import { createConversationRepository } from "../repositories/conversationRepository.js";
import { createTelegramConnectionRepository } from "../repositories/telegramConnectionRepository.js";
import { createDiscordConnectionRepository } from "../repositories/discordConnectionRepository.js";
import { createAgentExecutionRepository } from "../repositories/agentExecutionRepository.js";
import { createVerifySocialAccount } from "../runtime/verifySocialAccount.js";
import { createMinionAssignmentRuntime } from "../runtime/minionAssignmentRuntime.js";
import { buildHermesContext } from "../runtime/hermesContextBuilder.js";

export async function createHadesTestRuntime() {
  const minions = createMinionRepository({ storage: "memory" });
  const assignments = createAssignmentRepository({ storage: "memory" });
  const conversations = createConversationRepository({ storage: "memory" });
  const telegramConnections = createTelegramConnectionRepository({ storage: "memory", crypto: null });
  const discordConnections = createDiscordConnectionRepository({ storage: "memory" });
  const executions = createAgentExecutionRepository({ storage: "memory" });

  const verifySocialAccount = createVerifySocialAccount({
    discordConnections,
    telegramConnections,
  });

  const memory = {
    records: [],

    async create({ userId, tenantId, data }) {
      const record = { ...data, user_id: userId, tenant_id: tenantId };
      memory.records.push(record);
      return record;
    },

    async listByUser({ userId, tenantId }) {
      return memory.records.filter(
        (r) => r.user_id === userId && r.tenant_id === tenantId
      );
    },
  };

  const contextCache = new Map();

  const appContextCache = {
    async set({ userId, tenantId, key, value }) {
      contextCache.set(`${userId}:${tenantId}:${key}`, value);
    },
    async get({ userId, tenantId, key }) {
      return contextCache.get(`${userId}:${tenantId}:${key}`) || null;
    },
  };

  const hermesRuntime = {
    executeMinion: async () => ({
      assistantText: "ok",
      outboundActions: [{ type: "send_message", content: "hello" }],
    }),
  };

  const socialClient = {
    sendMessage: async () => ({ ok: true, providerMessageId: "msg_1" }),
  };

  const runtime = createMinionAssignmentRuntime({
    verifySocialAccount,
    assignmentRepository: assignments,
    minionRepository: minions,
    hermesRuntime,
    socialClient,
    executionRepository: executions,
  });

  async function buildContextForUser({ userId, tenantId, trigger }) {
    const scopedMemory = await memory.listByUser({ userId, tenantId });
    return buildHermesContext({
      authContext: { userId, tenantId },
      trigger,
      minion: null,
      assignment: null,
      scopedMemory,
      allowedTools: [],
    });
  }

  return {
    minions,
    assignments,
    conversations,
    telegramConnections,
    discordConnections,
    executions,
    memory,
    contextCache: appContextCache,
    hermesRuntime,
    socialClient,
    verifySocialAccount,
    runtime,
    buildContextForUser,
  };
}
