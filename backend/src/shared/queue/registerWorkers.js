import { Worker } from "bullmq";
import {
  STANDARD_JOB_NAMES,
  STANDARD_QUEUES
} from "../contracts/asyncJobQueue.contract.js";
import { createQueueConnection } from "./createQueueConnection.js";

/** @type {import("bullmq").Worker[]} */
const workers = [];

/**
 * @param {object} deps
 * @param {(payload: { runId: string, actionName: string }) => Promise<void>} deps.processAgentAction
 */
export function registerAgentActionWorker({ processAgentAction }) {
  const connection = createQueueConnection();
  if (!connection) return null;

  const worker = new Worker(
    STANDARD_QUEUES.AGENTS_RUN_ACTION,
    async (job) => {
      if (job.name !== STANDARD_JOB_NAMES.RUN_AGENT_ACTION) return;
      const { runId, actionName } = job.data ?? {};
      if (!runId || !actionName) return;
      await processAgentAction({ runId, actionName });
    },
    { connection }
  );

  workers.push(worker);
  return worker;
}

export async function closeWorkers() {
  await Promise.all(workers.map((w) => w.close()));
  workers.length = 0;
}
