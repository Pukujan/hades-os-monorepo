/**
 * @typedef {Object} AgentRunSnapshot
 * @property {string} runId
 * @property {string} agentId
 * @property {string} module
 * @property {string} machineVersion
 * @property {string} state
 * @property {string} status
 * @property {Record<string, unknown>} context
 * @property {Array<{ at: string, from: string, to: string, eventType: string, payload?: unknown }>} history
 */

/**
 * @typedef {Object} AgentPersistenceAdapter
 * @property {(input: { agentId: string, module: string, machineVersion: string, state: string, status: string, context: Record<string, unknown> }) => Promise<AgentRunSnapshot>} createRun
 * @property {(runId: string) => Promise<AgentRunSnapshot | null>} getRun
 * @property {(input: { runId: string, state: string, status: string, event: { from: string, to: string, eventType: string, payload?: unknown } }) => Promise<AgentRunSnapshot>} updateRun
 */

export {};
