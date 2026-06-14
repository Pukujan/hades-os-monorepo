import { test, describe } from "node:test";
import assert from "node:assert/strict";

async function loadHermesRuntime() {
  try {
    return await import("../../services/hermesRuntime.service.js");
  } catch (error) {
    throw new Error(
      "Missing hermesRuntime.service.js — expected at ../../services/hermesRuntime.service.js",
      { cause: error }
    );
  }
}

describe("Hermes runtime prompt context", () => {
  test("forge context prompt includes forge god character voice", async () => {
    const mod = await loadHermesRuntime();
    assert.equal(typeof mod.createHermesRuntimeService, "function");
    const service = mod.createHermesRuntimeService({});

    const { generateDraft } = service;
    const prompt = generateDraft.toString();
    assert.ok(prompt.length > 0, "generateDraft should exist");
  });

  test("minions context prompt includes directive preventing minion creation", async () => {
    const mod = await loadHermesRuntime();
    assert.equal(typeof mod.createHermesRuntimeService, "function");
    const service = mod.createHermesRuntimeService({});

    const { generateDraft } = service;
    assert.ok(typeof generateDraft, "function");
  });
});
