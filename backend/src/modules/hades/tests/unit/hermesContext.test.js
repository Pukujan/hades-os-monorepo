import { test, describe } from "node:test";
import assert from "node:assert/strict";

async function loadHermesService() {
  try {
    return await import("../../services/hermes.service.js");
  } catch (error) {
    throw new Error(
      "Missing hermes.service.js — expected at ../../services/hermes.service.js",
      { cause: error }
    );
  }
}

describe("Hermes context branching", () => {
  test("buildResponse forwards context field to generateDraft", async () => {
    const { createHermesService } = await loadHermesService();
    let receivedContext = null;

    const service = createHermesService({
      hermesRuntime: {
        async generateDraft({ context }) {
          receivedContext = context;
          return {
            assistantText: "ok",
            draftPatch: {},
            missingFields: [],
            suggestions: [],
            source: "test",
            sessionId: null,
          };
        },
      },
    });

    await service.buildResponse({
      userId: "user_1",
      conversationId: "conv_1",
      message: "hello",
      context: "forge",
    });

    assert.equal(receivedContext, "forge");
  });

  test("buildResponse passes context through to generateDraft for minions mode", async () => {
    const { createHermesService } = await loadHermesService();
    let receivedContext = null;

    const service = createHermesService({
      hermesRuntime: {
        async generateDraft({ context }) {
          receivedContext = context;
          return {
            assistantText: "ok",
            draftPatch: {},
            missingFields: [],
            suggestions: [],
            source: "test",
            sessionId: null,
          };
        },
      },
    });

    await service.buildResponse({
      userId: "user_1",
      conversationId: "conv_1",
      message: "create a minion",
      context: "minions",
    });

    assert.equal(receivedContext, "minions");
  });

  test("buildResponse defaults context to forge when not provided", async () => {
    const { createHermesService } = await loadHermesService();
    let receivedContext = null;

    const service = createHermesService({
      hermesRuntime: {
        async generateDraft({ context }) {
          receivedContext = context;
          return {
            assistantText: "ok",
            draftPatch: {},
            missingFields: [],
            suggestions: [],
            source: "test",
            sessionId: null,
          };
        },
      },
    });

    await service.buildResponse({
      userId: "user_1",
      conversationId: "conv_1",
      message: "hello",
    });

    assert.equal(receivedContext, "forge");
  });
});
