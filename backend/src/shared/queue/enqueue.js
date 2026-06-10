import { Queue } from "bullmq";
import {
  DEFAULT_JOB_OPTIONS,
  STANDARD_QUEUES,
  STANDARD_JOB_NAMES
} from "../contracts/asyncJobQueue.contract.js";
import { createQueueConnection } from "./createQueueConnection.js";
import { enqueueJobInMemory } from "./inMemoryQueue.adapter.js";

/** @type {Map<string, import("bullmq").Queue>} */
const queues = new Map();

/**
 * @param {string} queueKey
 */
function getQueue(queueKey) {
  let queue = queues.get(queueKey);
  if (queue) return queue;

  const connection = createQueueConnection();
  if (!connection) {
    throw new Error("REDIS_URL is not set — cannot enqueue async job");
  }

  queue = new Queue(queueKey, { connection });
  queues.set(queueKey, queue);
  return queue;
}

/**
 * @param {string} queueKey
 * @param {string} jobName
 * @param {Record<string, unknown>} payload
 */
export async function enqueueJob(queueKey, jobName, payload) {
  const connection = createQueueConnection();
  if (!connection) {
    return enqueueJobInMemory(queueKey, jobName, payload);
  }
  const queue = getQueue(queueKey);
  return queue.add(jobName, payload, DEFAULT_JOB_OPTIONS);
}

/**
 * @param {Record<string, unknown>} payload
 */
export async function enqueueAgentAction(payload) {
  return enqueueJob(STANDARD_QUEUES.AGENTS_RUN_ACTION, STANDARD_JOB_NAMES.RUN_AGENT_ACTION, payload);
}

export { STANDARD_QUEUES, STANDARD_JOB_NAMES };
