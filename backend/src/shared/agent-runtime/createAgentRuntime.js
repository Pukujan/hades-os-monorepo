/**
 * Minimal async-friendly agent state machine runtime.
 * Contract: moduleAgentStateMachine v001
 */

/**
 * @typedef {object} AgentMachineDefinition
 * @property {string} id
 * @property {string} version
 * @property {string} module
 * @property {string} initial
 * @property {string[]} [contextKeys]
 * @property {Record<string, AgentStateDefinition>} states
 */

/**
 * @typedef {object} AgentStateDefinition
 * @property {Record<string, string>} [on]
 * @property {string} [action]
 * @property {"final"} [type]
 */

/**
 * @typedef {object} AgentRunSnapshot
 * @property {string} runId
 * @property {string} agentId
 * @property {string} module
 * @property {string} state
 * @property {string} status
 * @property {Record<string, unknown>} context
 * @property {Array<{ at: string, from: string, to: string, eventType: string }>} history
 */

/**
 * @param {AgentMachineDefinition} machine
 */
export function validateAgentMachine(machine) {
  if (!machine?.id || !machine?.version || !machine?.module) {
    throw new Error("Agent machine requires id, version, and module");
  }
  if (!machine.initial || !machine.states?.[machine.initial]) {
    throw new Error(`Agent machine ${machine.id}: invalid initial state`);
  }
  for (const [name, def] of Object.entries(machine.states)) {
    if (def.type === "final") continue;
    if (def.on) {
      for (const next of Object.values(def.on)) {
        if (!machine.states[next]) {
          throw new Error(`Agent machine ${machine.id}: unknown state "${next}" from "${name}"`);
        }
      }
    }
  }
}

/**
 * @param {object} options
 * @param {import("./createAgentRuntime.types.js").AgentPersistenceAdapter} options.persistence
 */
export function createAgentRuntime({ persistence }) {
  /**
   * @param {object} input
   * @param {AgentMachineDefinition} input.machine
   * @param {Record<string, (ctx: { run: AgentRunSnapshot, payload?: unknown }) => Promise<{ emit?: Record<string, unknown> } | void>>} input.actions
   */
  function createController({ machine, actions }) {
    validateAgentMachine(machine);

    /**
     * @param {Record<string, unknown>} [initialContext]
     */
    async function start(initialContext = {}) {
      const run = await persistence.createRun({
        agentId: machine.id,
        module: machine.module,
        machineVersion: machine.version,
        state: machine.initial,
        status: "active",
        context: { ...initialContext }
      });

      await runEntryAction(run);
      return persistence.getRun(run.runId);
    }

    /**
     * @param {string} runId
     * @param {string} eventType
     * @param {unknown} [payload]
     */
    async function send(runId, eventType, payload) {
      const run = await persistence.getRun(runId);
      if (!run) throw new Error(`Agent run not found: ${runId}`);
      if (run.status !== "active") {
        throw new Error(`Agent run ${runId} is not active (${run.status})`);
      }

      const stateDef = machine.states[run.state];
      if (!stateDef) throw new Error(`Unknown state ${run.state}`);

      if (eventType === "CANCEL" && machine.states.cancelled) {
        return transition(run, "cancelled", eventType, payload, "cancelled");
      }

      const nextState = stateDef.on?.[eventType];
      if (!nextState) {
        throw new AppError(`Invalid transition: ${run.state} + ${eventType}`, 409);
      }

      const nextDef = machine.states[nextState];
      const terminalStatus =
        nextDef?.type === "final"
          ? nextState === "cancelled"
            ? "cancelled"
            : nextState === "failed"
              ? "failed"
              : "completed"
          : "active";

      return transition(run, nextState, eventType, payload, terminalStatus);
    }

    /**
     * @param {AgentRunSnapshot} run
     * @param {string} nextState
     * @param {string} eventType
     * @param {unknown} payload
     * @param {string} status
     */
    async function transition(run, nextState, eventType, payload, status) {
      const from = run.state;
      await persistence.updateRun({
        runId: run.runId,
        state: nextState,
        status,
        event: { from, to: nextState, eventType, payload }
      });

      if (status === "active") {
        const entered = await persistence.getRun(run.runId);
        if (entered) await runEntryAction(entered);
      }

      const latest = await persistence.getRun(run.runId);
      if (!latest) throw new Error(`Agent run not found: ${run.runId}`);
      return latest;
    }

    /**
     * @param {AgentRunSnapshot} run
     */
    async function runEntryAction(run) {
      const actionName = machine.states[run.state]?.action;
      if (!actionName) return;

      const handler = actions[actionName];
      if (!handler) {
        throw new Error(`Missing action handler: ${actionName}`);
      }

      const result = await handler({ run, payload: undefined });
      const emit = result?.emit;
      if (!emit || typeof emit !== "object") return;

      for (const [eventType, eventPayload] of Object.entries(emit)) {
        const current = await persistence.getRun(run.runId);
        if (current?.status === "active" && machine.states[current.state]?.on?.[eventType]) {
          await send(run.runId, eventType, eventPayload);
          break;
        }
      }
    }

    /**
     * @param {string} runId
     */
    async function getSnapshot(runId) {
      const run = await persistence.getRun(runId);
      if (!run) throw new Error(`Agent run not found: ${runId}`);
      return run;
    }

    return { start, send, getSnapshot, machine };
  }

  return { createController };
}
