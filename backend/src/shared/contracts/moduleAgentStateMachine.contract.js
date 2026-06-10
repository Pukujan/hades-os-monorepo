/** @readonly Per-module agent FSM controller contract. */

export const MODULE_AGENT_STATE_MACHINE_VERSION = "v001";

/** Default manifest path inside each module. */
export const AGENT_MANIFEST_FILENAME = "manifest.json";

/** Suffix for machine definition files under agents/. */
export const AGENT_MACHINE_FILE_SUFFIX = ".machine.js";

/** Terminal run statuses stored on agent_runs.status. */
export const AGENT_RUN_STATUSES = ["active", "completed", "failed", "cancelled"];

/** Recommended cross-module event names (eventBus). */
export const AGENT_BUS_EVENTS = {
  RUN_STARTED: "agent.run.started",
  RUN_TRANSITIONED: "agent.run.transitioned",
  RUN_COMPLETED: "agent.run.completed",
  RUN_FAILED: "agent.run.failed"
};

/** Recommended FSM input events — modules may extend. */
export const STANDARD_AGENT_EVENTS = {
  START: "START",
  INPUT_RECEIVED: "INPUT_RECEIVED",
  PLAN_READY: "PLAN_READY",
  TOOL_SUCCESS: "TOOL_SUCCESS",
  TOOL_FAILED: "TOOL_FAILED",
  VALIDATION_PASS: "VALIDATION_PASS",
  VALIDATION_FAIL: "VALIDATION_FAIL",
  HUMAN_APPROVED: "HUMAN_APPROVED",
  HUMAN_REJECTED: "HUMAN_REJECTED",
  ERROR: "ERROR",
  RETRY: "RETRY",
  CANCEL: "CANCEL"
};

/** Stable table names for agent run persistence. */
export const AGENT_DB_TABLES = {
  agentRuns: "agent_runs",
  agentRunEvents: "agent_run_events"
};

export { createAgentRuntime, validateAgentMachine } from "../agent-runtime/createAgentRuntime.js";
