import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { invokeApp } from "../../../shared/testing/invoke-app.js";
import { createHadesRoutes } from "../routes/hades.routes.js";
import { createHadesRepository } from "../repositories/hades.repository.js";
import { createHadesService } from "../services/hades.service.js";
import { createHermesService } from "../services/hermes.service.js";
import { createAgentExecutionRepository } from "../repositories/agentExecutionRepository.js";

describe("live chat Hermes scope", () => {
  let app;
  let hermesRuntime;
  let hermesService;
  let executions;

  function createTestAuth({ userId, tenantId }) {
    return {
      requireHadesAuth: async () => ({ userId, tenantId, sessionToken: "test" }),
    };
  }

  beforeEach(async () => {
    app = express();
    app.use(express.json());

    executions = createAgentExecutionRepository({ storage: "memory" });

    hermesService = {
      buildResponse: async (args) => {
        hermesRuntime = args;
        return {
          assistantMessage: { role: "assistant", content: "ok", status: "completed", suggestions: [] },
          draft: {},
          missingFields: [],
          suggestions: [],
          source: "test",
          sessionId: "sess_1",
        };
      },
    };
  });

  test("User A chat sends only User A scoped context to Hermes", async () => {
    await executions.create({ userId: "user_a", tenantId: "tenant_a", data: { id: "exec_a", content: "A private memory" } });
    await executions.create({ userId: "user_b", tenantId: "tenant_b", data: { id: "exec_b", content: "B private memory" } });

    const repository = createHadesRepository();
    const scopedRepos = { executions };

    const service = createHadesService({
      repository,
      scopedRepos,
      hermes: hermesService,
    });

    const router = createHadesRoutes({
      service,
      requireHadesAuth: createTestAuth({ userId: "user_a", tenantId: "tenant_a" }).requireHadesAuth,
    });

    app.use("/api/hades", router);

    await invokeApp(app, {
      method: "POST",
      path: "/api/hades/chat",
      headers: { authorization: "Bearer token-a" },
      body: {
        message: "what do you remember?",
        conversationId: "conv_1",
        idempotencyKey: "test-1",
        clientMessageId: "msg-1",
        currentDraft: null,
      },
    });

    assert.ok(hermesRuntime);
    assert.equal(hermesRuntime.userId, "user_a");
  });

  test("User B chat sends only User B scoped context to Hermes", async () => {
    await executions.create({ userId: "user_a", tenantId: "tenant_a", data: { id: "exec_a", content: "A private memory" } });
    await executions.create({ userId: "user_b", tenantId: "tenant_b", data: { id: "exec_b", content: "B private memory" } });

    const repository = createHadesRepository();
    const scopedRepos = { executions };

    const service = createHadesService({
      repository,
      scopedRepos,
      hermes: hermesService,
    });

    const router = createHadesRoutes({
      service,
      requireHadesAuth: createTestAuth({ userId: "user_b", tenantId: "tenant_b" }).requireHadesAuth,
    });

    app.use("/api/hades", router);

    await invokeApp(app, {
      method: "POST",
      path: "/api/hades/chat",
      headers: { authorization: "Bearer token-b" },
      body: {
        message: "what do you remember?",
        conversationId: "conv_1",
        idempotencyKey: "test-2",
        clientMessageId: "msg-2",
        currentDraft: null,
      },
    });

    assert.ok(hermesRuntime);
    assert.equal(hermesRuntime.userId, "user_b");
  });
});
