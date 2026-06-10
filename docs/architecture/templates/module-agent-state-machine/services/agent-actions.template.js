/**
 * Template — copy to backend/src/modules/<module>/services/agent-actions.js
 * Contract: moduleAgentStateMachine v001
 */

/**
 * @param {object} deps
 * @param {import("../repositories/agent-run.repository.js").createAgentRunRepository} deps.runs
 */
export function createAgentActions(deps) {
  void deps;

  return {
    /** @param {{ run: import("../../../shared/agent-runtime/createAgentRuntime.types.js").AgentRunSnapshot, payload?: unknown }} ctx */
    async plan({ run }) {
      // TODO: load prompt from prompts/, call LLM adapter, merge into context via repository
      void run;
      return { emit: { PLAN_READY: { planId: "stub-plan" } } };
    },

    /** @param {{ run: import("../../../shared/agent-runtime/createAgentRuntime.types.js").AgentRunSnapshot, payload?: unknown }} ctx */
    async execute({ run }) {
      void run;
      return { emit: { TOOL_SUCCESS: {} } };
    }
  };
}
