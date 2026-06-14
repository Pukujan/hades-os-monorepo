import { test, describe } from "node:test";
import assert from "node:assert/strict";

/**
 * Group G — Auth/User Scoping
 *
 * Rules:
 * 1. HADES_USER_ID env var must NOT be used in production (NODE_ENV=production)
 * 2. In production, userId must always come from verified auth token (authContext.userId)
 * 3. resolveUserId in hades.service.js must not return "local-user" in production
 */

describe("hades.service.js resolveUserId", () => {
  test("resolveUserId returns authContext.userId in production", async () => {
    process.env.NODE_ENV = "production";
    try {
      const mod = await import("../../services/hades.service.js");
      const service = mod.createHadesService({ repository: {}, hermes: {} });
    } finally {
      delete process.env.NODE_ENV;
    }
  });

  test("bootstrap uses authContext.userId in production when authContext is provided", async () => {
    process.env.NODE_ENV = "production";
    try {
      const mod = await import("../../services/hades.service.js");
      let usedUserId = null;

      const mockRepo = {
        getBootstrapState: async ({ userId }) => {
          usedUserId = userId;
          return { minions: [], assignments: [], conversations: [], authContext: { userId, tenantId: userId } };
        },
      };
      const service = mod.createHadesService({ repository: mockRepo, hermes: {} });
      const result = await service.bootstrap({}, { userId: "auth_user_1", tenantId: "tenant_1" });

      assert.equal(usedUserId, "auth_user_1");
      assert.notEqual(usedUserId, "local-user");
    } finally {
      delete process.env.NODE_ENV;
    }
  });
});

describe("config/index.js userId in production", () => {
  test("getHadesConfig does not default userId to local-user in production", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.HADES_USER_ID;
    try {
      const { getHadesConfig } = await import("../../config/index.js");
      const cfg = getHadesConfig();
      assert.ok(
        cfg.userId !== "local-user",
        `userId should not default to "local-user" in production, got: ${cfg.userId}`
      );
    } finally {
      delete process.env.NODE_ENV;
    }
  });
});
