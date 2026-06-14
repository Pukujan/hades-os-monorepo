import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createHadesService } from "../services/hades.service.js";

describe("Hades repository wiring", () => {
  let scopedRepos;
  let legacyRepository;

  beforeEach(() => {
    scopedRepos = {
      minions: {
        listByUser: async ({ userId, tenantId }) => {
          assert.equal(userId, "user_a");
          assert.equal(tenantId, "tenant_a");
          return [{ id: "minion_a", name: "A Minion", user_id: userId, tenant_id: tenantId }];
        },
        findById: async ({ id, userId, tenantId }) => {
          if (id === "minion_a" && userId === "user_a") {
            return { id: "minion_a", user_id: userId, tenant_id: tenantId };
          }
          return null;
        },
      },
      assignments: {
        create: async ({ userId, tenantId, data }) => ({
          ...data,
          id: "assign_new",
          user_id: userId,
          tenant_id: tenantId,
        }),
        findActiveAssignment: async ({ userId, tenantId, provider, commandName }) => {
          assert.equal(userId, "user_a");
          assert.equal(tenantId, "tenant_a");
          return { id: "assign_a", user_id: userId, tenant_id: tenantId };
        },
        listByUser: async ({ userId, tenantId }) => {
          return [{ id: "assign_a", user_id: userId, tenant_id: tenantId }];
        },
      },
    };

    legacyRepository = {
      listMinions: async () => [{ id: "legacy_minion" }],
      getAssignments: async () => [{ id: "legacy_assign" }],
      getBootstrapState: async () => ({ minions: [{ id: "legacy_minion" }] }),
    };
  });

  test("bootstrap uses scoped minion repository", async () => {
    const service = createHadesService({
      repository: legacyRepository,
      scopedRepos,
    });

    const result = await service.bootstrap({}, { userId: "user_a", tenantId: "tenant_a" });

    assert.equal(result.minions.length, 1);
    assert.equal(result.minions[0].id, "minion_a");
  });

  test("assignment lookup uses scoped assignment repository", async () => {
    const service = createHadesService({
      repository: legacyRepository,
      scopedRepos,
    });

    const result = await service.assignMinion(
      { minionId: "minion_a", socialLinkId: "discord", commandName: "!catgif", idempotencyKey: "test-assign-1" },
      { userId: "user_a", tenantId: "tenant_a" }
    );

    assert.ok(result.assignment);
    assert.equal(result.assignment.user_id, "user_a");
    assert.equal(result.assignment.tenant_id, "tenant_a");
  });
});
