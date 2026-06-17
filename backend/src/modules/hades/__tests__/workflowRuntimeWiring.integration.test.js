import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { invokeApp } from "../../../shared/testing/invoke-app.js";
import { createHadesRoutes } from "../routes/hades.routes.js";
import { createHadesService } from "../services/hades.service.js";
import { createHermesService } from "../services/hermes.service.js";
import { createHadesRepository } from "../repositories/hades.repository.js";
import { createExtensionKeyRepository } from "../workflows/extensionKeyRepository.js";
import { createWorkflowRepository } from "../workflows/workflowRepository.js";
import { createMemoryRecordRepository } from "../repositories/memoryRecordRepository.js";

describe("workflow runtime wiring", () => {
  let app;
  let extensionKeys;
  let workflowRepo;
  let memoryRecords;

  function createAuth({ userId, tenantId }) {
    return {
      requireHadesAuth: async () => ({ userId, tenantId, sessionToken: "test" }),
    };
  }

  beforeEach(async () => {
    app = express();
    app.use(express.json());

    extensionKeys = createExtensionKeyRepository({ storage: "memory" });
    workflowRepo = createWorkflowRepository({ storage: "memory" });
    memoryRecords = createMemoryRecordRepository({ storage: "memory" });
  });

  function setupService({ userId, tenantId }) {
    const scopedRepos = {
      minions: { listByUser: async () => [], findById: async () => null },
      conversations: {
        listConversations: async () => [],
        createConversation: async (opts) => ({ id: "conv-test", ...opts }),
        listMessages: async () => [],
        addMessage: async (opts) => ({ id: "msg-test", ...opts }),
        clearMessages: async () => ({ cleared: true }),
      },
      executions: { listByUser: async () => [], findById: async () => null, create: async () => null },
      extensionKeys,
      workflowDefinitions: workflowRepo,
      memoryRecords,
    };

    const repository = createHadesRepository();
    const hermes = createHermesService({
      hermesRuntime: { buildResponse: async () => ({ assistantMessage: { role: "assistant", content: "ok", status: "completed" }, cards: [], draft: null, missingFields: [], suggestions: [] }) },
    });

    const service = createHadesService({ repository, scopedRepos, hermes });
    return service;
  }

  function setupAppForUser(userId, tenantId) {
    const service = setupService({ userId, tenantId });
    const router = createHadesRoutes({
      service,
      requireHadesAuth: createAuth({ userId, tenantId }).requireHadesAuth,
      scopedRepos: {
        minions: { listByUser: async () => [], findById: async () => null },
        conversations: {
          listConversations: async () => [],
          createConversation: async (opts) => ({ id: "conv-test", ...opts }),
          listMessages: async () => [],
          addMessage: async (opts) => ({ id: "msg-test", ...opts }),
          clearMessages: async () => ({ cleared: true }),
        },
        executions: { listByUser: async () => [], findById: async () => null, create: async () => null },
        extensionKeys,
        workflowDefinitions: workflowRepo,
        memoryRecords,
      },
    });
    app.use("/api/hades", router);
    return { service, router };
  }

  test("POST /api/hades/extension/keys creates a scoped extension API key", async () => {
    setupAppForUser("user_a", "tenant_a");

    const res = await invokeApp(app, {
      method: "POST",
      path: "/api/hades/extension/keys",
      headers: { authorization: "Bearer token-a", "content-type": "application/json" },
      body: { name: "Chrome extension", scopes: ["workflow:read", "document:upload"] },
    });

    assert.equal(res.status, 201);
    const body = JSON.parse(res.body);
    assert.equal(typeof body.secret, "string");
    assert.ok(body.secret.startsWith("hx_"));
    assert.equal(body.record.name, "Chrome extension");
    assert.ok(body.record.secretPreview);
    assert.equal(body.record.secretPreview.includes(body.secret), false);
    assert.equal(JSON.stringify(body.record).includes(body.secret), false);
  });

  test("GET /api/hades/extension/keys lists only the authenticated user's keys", async () => {
    await extensionKeys.createKey({ userId: "user_a", tenantId: "tenant_a", data: { name: "Key A", scopes: ["workflow:read"] } });
    await extensionKeys.createKey({ userId: "user_b", tenantId: "tenant_b", data: { name: "Key B", scopes: ["workflow:read"] } });

    setupAppForUser("user_a", "tenant_a");

    const res = await invokeApp(app, {
      method: "GET",
      path: "/api/hades/extension/keys",
      headers: { authorization: "Bearer token-a" },
    });

    assert.equal(res.status, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.keys.length, 1);
    assert.equal(body.keys[0].name, "Key A");
    assert.equal(JSON.stringify(body).includes("Key B"), false);
  });

  test("POST /api/hades/extension/keys/:id/rotate rotates the key", async () => {
    const { record } = await extensionKeys.createKey({ userId: "user_a", tenantId: "tenant_a", data: { name: "Rotatable", scopes: ["workflow:read"] } });
    setupAppForUser("user_a", "tenant_a");

    const res = await invokeApp(app, {
      method: "POST",
      path: `/api/hades/extension/keys/${record.id}/rotate`,
      headers: { authorization: "Bearer token-a" },
    });

    assert.equal(res.status, 200);
    const body = JSON.parse(res.body);
    assert.equal(typeof body.secret, "string");
    assert.ok(body.secret.startsWith("hx_"));
  });

  test("POST /api/hades/extension/keys/:id/revoke revokes the key", async () => {
    const { record } = await extensionKeys.createKey({ userId: "user_a", tenantId: "tenant_a", data: { name: "Revocable", scopes: ["workflow:read"] } });
    setupAppForUser("user_a", "tenant_a");

    const res = await invokeApp(app, {
      method: "POST",
      path: `/api/hades/extension/keys/${record.id}/revoke`,
      headers: { authorization: "Bearer token-a" },
    });

    assert.equal(res.status, 200);
    const body = JSON.parse(res.body);
    assert.ok(body.record.revokedAt, "revokedAt should be set after revoke");
  });

  test("POST /api/hades/workflows creates a workflow definition", async () => {
    setupAppForUser("user_a", "tenant_a");

    const res = await invokeApp(app, {
      method: "POST",
      path: "/api/hades/workflows",
      headers: { authorization: "Bearer token-a", "content-type": "application/json" },
      body: { name: "Test workflow", goal: "Test goal", prompt: "Test prompt" },
    });

    assert.equal(res.status, 201);
    const body = JSON.parse(res.body);
    assert.equal(body.workflow.name, "Test workflow");
    assert.equal(body.workflow.user_id, "user_a");
    assert.ok(body.workflow.id);
  });

  test("GET /api/hades/workflows lists only the authenticated user's workflows", async () => {
    await workflowRepo.createDefinition({ userId: "user_a", tenantId: "tenant_a", data: { id: "wf_a", name: "A workflow", goal: "A goal" } });
    await workflowRepo.createDefinition({ userId: "user_b", tenantId: "tenant_b", data: { id: "wf_b", name: "B workflow", goal: "B goal" } });

    setupAppForUser("user_a", "tenant_a");

    const res = await invokeApp(app, {
      method: "GET",
      path: "/api/hades/workflows",
      headers: { authorization: "Bearer token-a" },
    });

    assert.equal(res.status, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.workflows.length, 1);
    assert.equal(body.workflows[0].id, "wf_a");
    assert.equal(JSON.stringify(body).includes("B workflow"), false);
  });
});
