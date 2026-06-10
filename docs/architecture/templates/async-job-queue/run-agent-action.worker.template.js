/**
 * Template — copy to backend/src/modules/<module>/workers/run-agent-action.worker.js
 * Contract: asyncJobQueue v001 + moduleAgentStateMachine v001
 */
import { Worker } from "bullmq";
import {
  STANDARD_JOB_NAMES,
  STANDARD_QUEUES
} from "../../../shared/contracts/asyncJobQueue.contract.js";
import { createQueueConnection } from "../../../shared/queue/createQueueConnection.js";

/**
 * @param {object} deps
 * @param {ReturnType<import("../services/agent-runner.service.js").createAgentRunnerService>} deps.agentRunner
 */
export function startRunAgentActionWorker(deps) {
  const connection = createQueueConnection();
  if (!connection) return null;

  return new Worker(
    STANDARD_QUEUES.AGENTS_RUN_ACTION,
    async (job) => {
      const { runId, eventType, payload } = job.data;
      await deps.agentRunner.send(runId, eventType, payload);
    },
    { connection }
  );
}

void STANDARD_JOB_NAMES;
