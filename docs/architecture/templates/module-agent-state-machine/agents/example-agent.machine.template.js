/**
 * Template — copy to backend/src/modules/<module>/agents/<agent-id>.machine.js
 * Contract: moduleAgentStateMachine v001
 */

/** @type {import("../../../../shared/agent-runtime/createAgentRuntime.js").AgentMachineDefinition} */
export const exampleAssistantMachine = {
  id: "example-assistant",
  version: "v001",
  module: "<module-name>",
  initial: "idle",
  contextKeys: ["documentId", "matterId"],
  states: {
    idle: { on: { START: "planning" } },
    planning: { on: { PLAN_READY: "executing", ERROR: "failed" }, action: "plan" },
    executing: { on: { TOOL_SUCCESS: "validating", ERROR: "failed" }, action: "execute" },
    validating: {
      on: {
        VALIDATION_PASS: "completed",
        VALIDATION_FAIL: "awaiting_human_review"
      }
    },
    awaiting_human_review: {
      on: {
        HUMAN_APPROVED: "completed",
        HUMAN_REJECTED: "failed",
        RETRY: "planning"
      }
    },
    completed: { type: "final" },
    failed: { type: "final" },
    cancelled: { type: "final" }
  }
};
