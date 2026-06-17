import { test, describe } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { invokeApp } from "../../../../shared/testing/invoke-app.js";
import { createHadesRoutes } from "../../routes/hades.routes.js";
import { createHadesService } from "../../services/hades.service.js";
import { createConversationRepository } from "../../repositories/conversationRepository.js";
import { createAgentExecutionRepository } from "../../repositories/agentExecutionRepository.js";

describe("Hermes memory isolation TDD contract", () => {
  test("DELETE /conversations/:id/messages returns not_found when auth scope does not own the conversation", async () => {
    const app = express();
    app.use(express.json());
    app.use(
      "/api/hades",
      createHadesRoutes({
        requireHadesAuth: async () => ({
          userId: "user_a",
          tenantId: "tenant_a",
          sessionToken: "token-a",
        }),
        service: {
          async clearMessages() {
            return null;
          },
        },
      })
    );

    const response = await invokeApp(app, {
      method: "DELETE",
      path: "/api/hades/conversations/conv_b/messages",
      headers: { authorization: "Bearer token-a" },
    });

    assert.equal(response.status, 404);
    assert.equal(JSON.parse(response.body).code, "not_found");
  });

  test("chat passes only auth-scoped durable memory records into Hermes", async () => {
    const conversations = createConversationRepository({ storage: "memory" });
    const executions = createAgentExecutionRepository({ storage: "memory" });
    const durableRows = [
      { id: "mem_a", user_id: "user_a", tenant_id: "tenant_a", content: "A private memory" },
      { id: "mem_b", user_id: "user_b", tenant_id: "tenant_b", content: "B private memory" },
    ];

    let hermesInput = null;
    const service = createHadesService({
      repository: { saveAgentExecution: async () => null },
      scopedRepos: {
        conversations,
        executions,
        memoryRecords: {
          async listByUser({ userId, tenantId }) {
            return durableRows.filter((row) => row.user_id === userId && row.tenant_id === tenantId);
          },
        },
      },
      hermes: {
        async buildResponse(input) {
          hermesInput = input;
          return {
            assistantMessage: { role: "assistant", content: "ok", status: "completed", suggestions: [], actions: [] },
            cards: [],
            draft: {},
            missingFields: [],
            suggestions: [],
            source: "test",
            sessionId: "sess-memory",
          };
        },
      },
    });

    await service.chat(
      {
        clientMessageId: "msg-a",
        idempotencyKey: "idem-a",
        message: "what do you remember about me?",
        conversationType: "general",
      },
      { userId: "user_a", tenantId: "tenant_a" }
    );

    assert.ok(hermesInput, "Hermes should receive a request");
    assert.deepEqual(hermesInput.memoryRecords, [
      { id: "mem_a", user_id: "user_a", tenant_id: "tenant_a", content: "A private memory" },
    ]);
    assert.equal(JSON.stringify(hermesInput).includes("B private memory"), false);
  });

  test("memory record repository persists and lists durable records by userId and tenantId", async () => {
    const { createMemoryRecordRepository } = await import("../../repositories/memoryRecordRepository.js");
    const repo = createMemoryRecordRepository({ storage: "memory" });

    await repo.create({
      userId: "user_a",
      tenantId: "tenant_a",
      data: { id: "mem_a", scope: "user", content: "A private memory" },
    });
    await repo.create({
      userId: "user_b",
      tenantId: "tenant_b",
      data: { id: "mem_b", scope: "user", content: "B private memory" },
    });

    const userARecords = await repo.listByUser({ userId: "user_a", tenantId: "tenant_a" });

    assert.equal(userARecords.length, 1);
    assert.equal(userARecords[0].id, "mem_a");
    assert.equal(JSON.stringify(userARecords).includes("B private memory"), false);
  });
});
