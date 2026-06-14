import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { invokeApp } from "../../../shared/testing/invoke-app.js";
import { register as registerAuth } from "../../auth/index.js";
import { createHadesRoutes } from "../routes/hades.routes.js";
import { createHadesRepository } from "../repositories/hades.repository.js";
import { createMinionRepository } from "../repositories/minionRepository.js";
import { createAssignmentRepository } from "../repositories/assignmentRepository.js";
import { createConversationRepository } from "../repositories/conversationRepository.js";
import { createHadesService } from "../services/hades.service.js";
import { createHermesService } from "../services/hermes.service.js";

describe("live two-user isolation", () => {
  let app;
  let minions;
  let conversations;

  function createTestAuth({ userId, tenantId }) {
    return {
      requireHadesAuth: async () => ({ userId, tenantId, sessionToken: "test" }),
    };
  }

  beforeEach(async () => {
    app = express();
    app.use(express.json());

    minions = createMinionRepository({ storage: "memory" });
    conversations = createConversationRepository({ storage: "memory" });

    const authModule = await registerAuth(app);

    await minions.create({ userId: "user_a", tenantId: "tenant_a", data: { id: "minion_a", name: "A Minion" } });
    await minions.create({ userId: "user_b", tenantId: "tenant_b", data: { id: "minion_b", name: "B Minion" } });

    await conversations.createConversation({ userId: "user_a", tenantId: "tenant_a", data: { id: "conv_a", title: "A Chat" } });
    await conversations.createConversation({ userId: "user_b", tenantId: "tenant_b", data: { id: "conv_b", title: "B Chat" } });
  });

  async function setupAppForUser(userId, tenantId) {
    const repository = createHadesRepository();
    const hermes = createHermesService({});
    const scopedRepos = { minions, conversations };

    const service = createHadesService({ repository, scopedRepos, hermes });

    const router = createHadesRoutes({
      service,
      requireHadesAuth: createTestAuth({ userId, tenantId }).requireHadesAuth,
    });

    return { service, router };
  }

  test("User A bootstrap only returns User A data", async () => {
    const { router } = await setupAppForUser("user_a", "tenant_a");
    app.use("/api/hades", router);

    const res = await invokeApp(app, {
      method: "GET",
      path: "/api/hades/bootstrap",
      headers: { authorization: "Bearer token-a" },
    });

    assert.equal(res.status, 200);
    const body = JSON.parse(res.body);
    assert.ok(JSON.stringify(body).includes("A Minion"));
    assert.ok(!JSON.stringify(body).includes("B Minion"));
  });

  test("User B bootstrap only returns User B data", async () => {
    const { router } = await setupAppForUser("user_b", "tenant_b");
    app.use("/api/hades", router);

    const res = await invokeApp(app, {
      method: "GET",
      path: "/api/hades/bootstrap",
      headers: { authorization: "Bearer token-b" },
    });

    assert.equal(res.status, 200);
    const body = JSON.parse(res.body);
    assert.ok(JSON.stringify(body).includes("B Minion"));
    assert.ok(!JSON.stringify(body).includes("A Minion"));
  });

  test("User A cannot fetch User B conversation messages", async () => {
    const { router } = await setupAppForUser("user_a", "tenant_a");
    app.use("/api/hades", router);

    const res = await invokeApp(app, {
      method: "GET",
      path: "/api/hades/conversations/conv_b/messages",
      headers: { authorization: "Bearer token-a" },
    });

    assert.equal(res.status, 404);
  });

  test("User A cannot clear User B messages", async () => {
    const { router } = await setupAppForUser("user_a", "tenant_a");
    app.use("/api/hades", router);

    const res = await invokeApp(app, {
      method: "DELETE",
      path: "/api/hades/conversations/conv_b/messages",
      headers: { authorization: "Bearer token-a" },
    });

    assert.equal(res.status, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.cleared, true);
    assert.equal(body.stale, true);
  });
});
