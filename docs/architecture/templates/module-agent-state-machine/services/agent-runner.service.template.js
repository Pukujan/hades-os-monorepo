/**
 * Template — copy to backend/src/modules/<module>/services/agent-runner.service.js
 * Contract: moduleAgentStateMachine v001
 */
import {
  AGENT_BUS_EVENTS,
  createAgentRuntime,
  STANDARD_AGENT_EVENTS
} from "../../../shared/contracts/moduleAgentStateMachine.contract.js";
import { exampleAssistantMachine } from "../agents/example-assistant.machine.js";
import { createAgentActions } from "./agent-actions.js";

/** @type {Record<string, import("../../../shared/agent-runtime/createAgentRuntime.js").AgentMachineDefinition>} */
const MACHINES = {
  [exampleAssistantMachine.id]: exampleAssistantMachine
};

/**
 * @param {object} deps
 * @param {ReturnType<import("../repositories/agent-run.repository.js").createAgentRunRepository>} deps.persistence
 * @param {{ emit: (event: string, payload: unknown) => void }} deps.eventBus
 */
export function createAgentRunnerService({ persistence, eventBus }) {
  const runtime = createAgentRuntime({ persistence });
  const actions = createAgentActions({ runs: persistence });

  /**
   * @param {string} agentId
   * @param {Record<string, unknown>} [initialContext]
   */
  async function start(agentId, initialContext = {}) {
    const machine = MACHINES[agentId];
    if (!machine) throw new Error(`Unknown agent: ${agentId}`);

    const controller = runtime.createController({ machine, actions });
    const run = await controller.start(initialContext);
    await controller.send(run.runId, STANDARD_AGENT_EVENTS.START);

    const snapshot = await controller.getSnapshot(run.runId);
    eventBus.emit(AGENT_BUS_EVENTS.RUN_STARTED, {
      runId: snapshot.runId,
      agentId: snapshot.agentId,
      module: snapshot.module,
      state: snapshot.state
    });
    return snapshot;
  }

  /**
   * @param {string} runId
   * @param {string} eventType
   * @param {unknown} [payload]
   */
  async function send(runId, eventType, payload) {
    const existing = await persistence.getRun(runId);
    if (!existing) throw new Error(`Run not found: ${runId}`);

    const machine = MACHINES[existing.agentId];
    const controller = runtime.createController({ machine, actions });
    const from = existing.state;
    const snapshot = await controller.send(runId, eventType, payload);

    eventBus.emit(AGENT_BUS_EVENTS.RUN_TRANSITIONED, {
      runId,
      agentId: snapshot.agentId,
      from,
      to: snapshot.state,
      eventType
    });

    if (snapshot.status === "completed") {
      eventBus.emit(AGENT_BUS_EVENTS.RUN_COMPLETED, {
        runId,
        agentId: snapshot.agentId,
        context: snapshot.context
      });
    } else if (snapshot.status === "failed") {
      eventBus.emit(AGENT_BUS_EVENTS.RUN_FAILED, {
        runId,
        agentId: snapshot.agentId,
        error: `Run failed in state ${snapshot.state}`
      });
    }

    return snapshot;
  }

  async function getSnapshot(runId) {
    const run = await persistence.getRun(runId);
    if (!run) throw new Error(`Run not found: ${runId}`);
    return run;
  }

  return { start, send, getSnapshot };
}
