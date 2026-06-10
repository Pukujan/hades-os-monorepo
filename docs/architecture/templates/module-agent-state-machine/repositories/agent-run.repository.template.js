/**
 * Template — copy to backend/src/modules/<module>/repositories/agent-run.repository.js
 * Contract: moduleAgentStateMachine v001
 */
import { randomUUID } from "crypto";
import { AGENT_DB_TABLES } from "../../../shared/contracts/moduleAgentStateMachine.contract.js";

/**
 * In-memory adapter for local development. Replace with SQL when DATABASE_URL is set.
 */
export function createInMemoryAgentRunRepository() {
  /** @type {Map<string, import("../../../shared/agent-runtime/createAgentRuntime.types.js").AgentRunSnapshot>} */
  const runs = new Map();

  return createAgentRunRepository({
    tables: AGENT_DB_TABLES,
    async createRun(input) {
      const runId = randomUUID();
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
      if (!run) throw new Error(`Run not found: ${runId}`);
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
  });
}

/**
 * @param {import("../../../shared/agent-runtime/createAgentRuntime.types.js").AgentPersistenceAdapter & { tables: typeof AGENT_DB_TABLES }} adapter
 */
export function createAgentRunRepository(adapter) {
  return adapter;
}
