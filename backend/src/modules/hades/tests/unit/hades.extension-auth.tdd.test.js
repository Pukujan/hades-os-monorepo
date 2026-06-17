import assert from "node:assert/strict";
import express from "express";
import { describe, test } from "node:test";
import { invokeApp } from "../../../../shared/testing/invoke-app.js";
import { createHadesRoutes } from "../../routes/hades.routes.js";
import { createExtensionKeyRepository } from "../../workflows/extensionKeyRepository.js";

describe("Hades extension runtime auth TDD contract", () => {
  test("extension runtime route resolves user and tenant from the extension API key, not caller input", async () => {
    const extensionKeys = createExtensionKeyRepository({ storage: "memory" });
    const created = await extensionKeys.createKey({
      userId: "user_a",
      tenantId: "tenant_a",
      data: { name: "Chrome", scopes: ["workflow:read"] },
    });

    const app = express();
    app.use(express.json());
    app.use(
      "/api/hades",
      createHadesRoutes({
        service: {
          readiness: async () => ({ status: "ok" }),
          listExtensionWorkflows: async (authContext) => ({
            authContext,
            workflows: [{ id: "wf_a", userId: authContext.userId, tenantId: authContext.tenantId }],
          }),
        },
        scopedRepos: { extensionKeys },
      }),
    );

    const res = await invokeApp(app, {
      method: "GET",
      path: "/api/hades/extension/workflows?userId=user_b&tenantId=tenant_b",
      headers: { authorization: `Bearer ${created.plaintextKey}` },
    });

    assert.equal(res.status, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.authContext.userId, "user_a");
    assert.equal(body.authContext.tenantId, "tenant_a");
    assert.equal(JSON.stringify(body).includes("user_b"), false);
  });

  test("extension runtime route rejects missing, revoked, and wrong-scope extension API keys", async () => {
    const extensionKeys = createExtensionKeyRepository({ storage: "memory" });
    const revoked = await extensionKeys.createKey({
      userId: "user_a",
      tenantId: "tenant_a",
      data: { name: "Revoked", scopes: ["workflow:read"] },
    });
    const wrongScope = await extensionKeys.createKey({
      userId: "user_a",
      tenantId: "tenant_a",
      data: { name: "Wrong scope", scopes: ["document:upload"] },
    });
    await extensionKeys.revokeKey({
      id: revoked.record.id,
      userId: "user_a",
      tenantId: "tenant_a",
    });

    const app = express();
    app.use(express.json());
    app.use(
      "/api/hades",
      createHadesRoutes({
        service: {
          readiness: async () => ({ status: "ok" }),
          listExtensionWorkflows: async () => ({ workflows: [] }),
        },
        scopedRepos: { extensionKeys },
      }),
    );

    for (const authorization of [
      undefined,
      "Bearer hx_missing",
      `Bearer ${revoked.plaintextKey}`,
      `Bearer ${wrongScope.plaintextKey}`,
    ]) {
      const headers = authorization ? { authorization } : {};
      const res = await invokeApp(app, {
        method: "GET",
        path: "/api/hades/extension/workflows",
        headers,
      });

      assert.equal(res.status, 401);
    }
  });
});
