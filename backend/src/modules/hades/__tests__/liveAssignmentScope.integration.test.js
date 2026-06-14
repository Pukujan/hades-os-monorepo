import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { invokeApp } from "../../../shared/testing/invoke-app.js";
import { createHadesRoutes } from "../routes/hades.routes.js";
import { createHadesRepository } from "../repositories/hades.repository.js";
import { createMinionRepository } from "../repositories/minionRepository.js";
import { createAssignmentRepository } from "../repositories/assignmentRepository.js";
import { createHadesService } from "../services/hades.service.js";
import { createHermesService } from "../services/hermes.service.js";

describe("live assignment scope", () => {
  let app;
  let minions;
  let assignments;

  function createTestAuth({ userId, tenantId }) {
    return {
      requireHadesAuth: async () => ({ userId, tenantId, sessionToken: "test" }),
    };
  }

  beforeEach(async () => {
    app = express();
    app.use(express.json());

    minions = createMinionRepository({ storage: "memory" });
    assignments = createAssignmentRepository({ storage: "memory" });

    await minions.create({ userId: "user_a", tenantId: "tenant_a", data: { id: "minion_a", name: "A Minion" } });
    await minions.create({ userId: "user_b", tenantId: "tenant_b", data: { id: "minion_b", name: "B Minion" } });
  });

  function setupAppForUser(userId, tenantId) {
    const repository = createHadesRepository();
    const hermes = createHermesService({});
    const scopedRepos = { minions, assignments };

    const service = createHadesService({ repository, scopedRepos, hermes });

    const router = createHadesRoutes({
      service,
      requireHadesAuth: createTestAuth({ userId, tenantId }).requireHadesAuth,
    });

    return router;
  }

  test("User A can assign User A minion", async () => {
    const router = setupAppForUser("user_a", "tenant_a");
    app.use("/api/hades", router);

    const res = await invokeApp(app, {
      method: "POST",
      path: "/api/hades/assignments",
      headers: { authorization: "Bearer token-a" },
      body: {
        minionId: "minion_a",
        socialLinkId: "discord",
        commandName: "!a",
        idempotencyKey: "assign-a-1",
      },
    });

    assert.equal(res.status, 201);
    const body = JSON.parse(res.body);
    assert.equal(body.assignment.user_id, "user_a");
    assert.equal(body.assignment.tenant_id, "tenant_a");
  });

  test("User A cannot assign User B minion", async () => {
    const router = setupAppForUser("user_a", "tenant_a");
    app.use("/api/hades", router);

    const res = await invokeApp(app, {
      method: "POST",
      path: "/api/hades/assignments",
      headers: { authorization: "Bearer token-a" },
      body: {
        minionId: "minion_b",
        socialLinkId: "discord",
        commandName: "!steal",
        idempotencyKey: "assign-steal-1",
      },
    });

    assert.equal(res.status, 404);
  });

  test("User B assignments do not appear in User A bootstrap", async () => {
    await assignments.create({
      userId: "user_b",
      tenantId: "tenant_b",
      data: {
        id: "assign_b",
        minion_id: "minion_b",
        provider: "discord",
        command_name: "!b",
        status: "active",
      },
    });

    const router = setupAppForUser("user_a", "tenant_a");
    app.use("/api/hades", router);

    const res = await invokeApp(app, {
      method: "GET",
      path: "/api/hades/bootstrap",
      headers: { authorization: "Bearer token-a" },
    });

    assert.equal(res.status, 200);
    const body = JSON.parse(res.body);
    const payload = JSON.stringify(body);
    assert.ok(!payload.includes("!b"));
    assert.ok(!payload.includes("minion_b"));
  });
});
