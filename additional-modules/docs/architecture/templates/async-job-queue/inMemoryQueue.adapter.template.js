/**
 * Template — copy to backend/src/shared/queue/inMemoryQueue.adapter.js
 * Contract: asyncJobQueue v001 — for tests / local dev without Redis
 */

/** @type {Array<{ queueKey: string, jobName: string, payload: Record<string, unknown> }>} */
const pending = [];

/**
 * @param {string} queueKey
 * @param {string} jobName
 * @param {Record<string, unknown>} payload
 */
export async function enqueueJobInMemory(queueKey, jobName, payload) {
  pending.push({ queueKey, jobName, payload });
}

export function drainInMemoryQueue() {
  return pending.splice(0, pending.length);
}

export function clearInMemoryQueue() {
  pending.length = 0;
}
