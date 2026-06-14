import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { invokeApp } from "../../../shared/testing/invoke-app.js";
import { createTestApp } from "../../../shared/testing/create-test-app.js";
import { createHadesRoutes } from "../routes/hades.routes.js";

describe("Hades route auth wiring", () => {
  let service;
  let callCount;

  async function buildApp(authOverride) {
    callCount = 0;

    service = {
      async bootstrap(params, authCtx) {
        callCount++;
        return { status: "ok", authContext: authCtx };
      },
      async chat(body, authCtx) {
        callCount++;
        return { status: "ok", authContext: authCtx };
      },
      async assignMinion(body, authCtx) {
        callCount++;
        return { status: "ok", authContext: authCtx };
      },
      async handleTrigger(body) {
        return { status: "sent" };
      },
    };

    const authImpl = authOverride || (async () => ({
      userId: "user_a",
      tenantId: "tenant_a",
      sessionToken: "token-a",
    }));

    const router = createHadesRoutes({ service, requireHadesAuth: authImpl });
    const app = await createTestApp(async (expressApp) => {
      expressApp.use("/api/hades", router);
    });
    return app;
  }

  test("rejects GET /bootstrap without auth", async () => {
    const app = await buildApp(async () => {
      throw Object.assign(new Error("Missing auth"), { code: "missing_auth" });
    });

    const res = await invokeApp(app, {
      method: "GET",
      path: "/api/hades/bootstrap",
    });

    assert.equal(res.status, 401);
    const body = JSON.parse(res.body);
    assert.equal(body.code, "missing_auth");
  });

  test("rejects POST /chat without auth", async () => {
    const app = await buildApp(async () => {
      throw Object.assign(new Error("Missing auth"), { code: "missing_auth" });
    });

    const res = await invokeApp(app, {
      method: "POST",
      path: "/api/hades/chat",
      body: { message: "hello" },
    });

    assert.equal(res.status, 401);
    const body = JSON.parse(res.body);
    assert.equal(body.code, "missing_auth");
  });

  test("rejects POST /assignments without auth", async () => {
    const app = await buildApp(async () => {
      throw Object.assign(new Error("Missing auth"), { code: "missing_auth" });
    });

    const res = await invokeApp(app, {
      method: "POST",
      path: "/api/hades/assignments",
      body: { minionId: "minion_a" },
    });

    assert.equal(res.status, 401);
    const body = JSON.parse(res.body);
    assert.equal(body.code, "missing_auth");
  });

  test("passes resolved authContext into bootstrap", async () => {
    const app = await buildApp();

    const res = await invokeApp(app, {
      method: "GET",
      path: "/api/hades/bootstrap",
      headers: { authorization: "Bearer valid-a" },
    });

    assert.equal(res.status, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.authContext.userId, "user_a");
    assert.equal(body.authContext.tenantId, "tenant_a");
  });

  test("does not trust user_id from request body", async () => {
    const app = await buildApp(async (req) => ({
      userId: "user_a",
      tenantId: "tenant_a",
      sessionToken: "token-a",
    }));

    const res = await invokeApp(app, {
      method: "POST",
      path: "/api/hades/chat",
      headers: { authorization: "Bearer valid-a" },
      body: {
        user_id: "user_b",
        tenant_id: "tenant_b",
        message: "try hijack",
        conversationId: "conv_1",
        idempotencyKey: "test-1",
        currentDraft: null,
      },
    });

    assert.equal(res.status, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.authContext.userId, "user_a");
    assert.equal(body.authContext.tenantId, "tenant_a");
  });
});
