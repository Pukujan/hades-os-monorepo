/**
 * Template — copy to backend/src/shared/queue/enqueue.js
 * Contract: asyncJobQueue v001
 *
 * Requires: npm install bullmq ioredis --prefix backend
 */
import { Queue } from "bullmq";
import {
  DEFAULT_JOB_OPTIONS,
  STANDARD_QUEUES
} from "../contracts/asyncJobQueue.contract.js";
import { createQueueConnection } from "./createQueueConnection.js";

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
  const queue = getQueue(queueKey);
  return queue.add(jobName, payload, DEFAULT_JOB_OPTIONS);
}

export { STANDARD_QUEUES };
