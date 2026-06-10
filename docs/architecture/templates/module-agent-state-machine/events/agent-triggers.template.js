/**
 * Template — merge into backend/src/modules/<module>/events/index.js
 * Contract: moduleAgentStateMachine v001
 */

/**
 * @param {object} input
 * @param {{ emit: Function, on: Function }} input.context.eventBus
 * @param {ReturnType<import("../services/agent-runner.service.js").createAgentRunnerService>} input.agentRunner
 */
export function registerAgentEventTriggers({ context, agentRunner }) {
  // Cross-module: start agent when a document is parsed (documentPersistence contract)
  context.eventBus.on("document.parsed", async ({ documentId }) => {
    try {
      await agentRunner.start("example-assistant", { documentId });
    } catch (error) {
      context.eventBus.emit("agent.run.failed", {
        agentId: "example-assistant",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Module-local reactions to agent lifecycle
  context.eventBus.on("agent.run.completed", ({ runId, agentId }) => {
    void runId;
    void agentId;
    // TODO: notify UI, enqueue next step, etc.
  });
}
