/** @type {Array<{ queueKey: string, jobName: string, payload: Record<string, unknown> }>} */
const pending = [];

/** @type {((job: { queueKey: string, jobName: string, payload: Record<string, unknown> }) => Promise<void>) | null} */
let processor = null;

/**
 * @param {(job: { queueKey: string, jobName: string, payload: Record<string, unknown> }) => Promise<void>} fn
 */
export function setInMemoryQueueProcessor(fn) {
  processor = fn;
}

/**
 * @param {string} queueKey
 * @param {string} jobName
 * @param {Record<string, unknown>} payload
 */
export async function enqueueJobInMemory(queueKey, jobName, payload) {
  const job = { queueKey, jobName, payload };
  if (processor) {
    await processor(job);
    return job;
  }
  pending.push(job);
  return job;
}

export function drainInMemoryQueue() {
  return pending.splice(0, pending.length);
}

export function clearInMemoryQueue() {
  pending.length = 0;
}
