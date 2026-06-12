import { test } from "node:test";
import assert from "node:assert/strict";
import { createHadesRepository } from "../../repositories/hades.repository.js";
import { createHadesService } from "../../services/hades.service.js";

test("service bootstrap exposes stable hydration shape", async () => {
  const repository = createHadesRepository({ now: () => "2026-06-10T00:00:00.000Z" });
  const service = createHadesService({
    repository,
    hermes: {
      async buildResponse() {
        throw new Error("not used");
      }
    }
  });

  const state = await service.bootstrap({});

  assert.equal(state.userId, "local-user");
  assert.ok(state.conversationId);
  assert.ok(Array.isArray(state.messages));
  assert.ok(state.draft);
  assert.ok(Array.isArray(state.minions));
  assert.ok(Array.isArray(state.assignments));
  assert.ok(Array.isArray(state.socialLinks));
  assert.ok(state.levelState);
  assert.equal(state.source, "memory");
});

