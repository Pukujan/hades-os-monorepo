import { test } from "node:test";
import assert from "node:assert/strict";
import { createAgentRuntime, validateAgentMachine } from "./createAgentRuntime.js";

const exampleMachine = {
  id: "example-assistant",
  version: "v001",
  module: "_reference",
  initial: "idle",
  states: {
    idle: { on: { START: "planning" } },
    planning: { on: { PLAN_READY: "executing", ERROR: "failed" }, action: "plan" },
    executing: { on: { TOOL_SUCCESS: "completed", ERROR: "failed" } },
    completed: { type: "final" },
    failed: { type: "final" },
    cancelled: { type: "final" }
  }
};

function createMemoryPersistence() {
  /** @type {Map<string, import("./createAgentRuntime.types.js").AgentRunSnapshot>} */
  const runs = new Map();
  let seq = 0;

  return {
    async createRun(input) {
      const runId = `run-${++seq}`;
      const run = {
        runId,
        agentId: input.agentId,
        module: input.module,
        machineVersion: input.machineVersion,
        state: input.state,
        status: input.status,
        context: input.context,
        history: []
      };
      runs.set(runId, run);
      return structuredClone(run);
    },
    async getRun(runId) {
      const run = runs.get(runId);
      return run ? structuredClone(run) : null;
    },
    async updateRun({ runId, state, status, event }) {
      const run = runs.get(runId);
      if (!run) throw new Error("missing");
      run.state = state;
      run.status = status;
      run.history.push({
        at: new Date().toISOString(),
        from: event.from,
        to: event.to,
        eventType: event.eventType,
        payload: event.payload
      });
      return structuredClone(run);
    }
  };
}

test("validateAgentMachine rejects invalid initial state", () => {
  assert.throws(() =>
    validateAgentMachine({ id: "x", version: "v001", module: "m", initial: "nope", states: {} })
  );
});

test("agent runtime walks happy path with auto-emitted plan event", async () => {
  const persistence = createMemoryPersistence();
  const runtime = createAgentRuntime({ persistence });
  const controller = runtime.createController({
    machine: exampleMachine,
    actions: {
      plan: async () => ({ emit: { PLAN_READY: { planId: "p1" } } })
    }
  });

  const started = await controller.start({ documentId: "doc-1" });
  const afterStart = await controller.send(started.runId, "START");
  assert.equal(afterStart.state, "executing");
  assert.equal(afterStart.status, "active");

  const done = await controller.send(afterStart.runId, "TOOL_SUCCESS");
  assert.equal(done.state, "completed");
  assert.equal(done.status, "completed");
  assert.equal(done.history.length, 3);
});

test("agent runtime rejects invalid transition", async () => {
  const persistence = createMemoryPersistence();
  const runtime = createAgentRuntime({ persistence });
  const controller = runtime.createController({
    machine: exampleMachine,
    actions: {}
  });

  const started = await controller.start();
  await assert.rejects(() => controller.send(started.runId, "PLAN_READY"));
});

test("CANCEL transitions to cancelled when state exists", async () => {
  const persistence = createMemoryPersistence();
  const runtime = createAgentRuntime({ persistence });
  const controller = runtime.createController({
    machine: exampleMachine,
    actions: {
      plan: async () => ({ emit: { PLAN_READY: {} } })
    }
  });

  const started = await controller.start();
  const inPlanning = await controller.send(started.runId, "START");
  const cancelled = await controller.send(inPlanning.runId, "CANCEL");
  assert.equal(cancelled.state, "cancelled");
  assert.equal(cancelled.status, "cancelled");
});
