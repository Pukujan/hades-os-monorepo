/**
 * Template — copy to backend/src/modules/<module>/workers/parse-document.worker.js
 * Contract: asyncJobQueue v001 + documentPersistence v001
 */
import { Worker } from "bullmq";
import {
  STANDARD_JOB_NAMES,
  STANDARD_QUEUES
} from "../../../shared/contracts/asyncJobQueue.contract.js";
import { createQueueConnection } from "../../../shared/queue/createQueueConnection.js";

/**
 * @param {object} deps
 * @param {ReturnType<import("../services/document-ingest.service.js").createDocumentIngestService>} deps.ingest
 * @param {{ emit: (event: string, payload: unknown) => void }} deps.eventBus
 */
export function startParseDocumentWorker(deps) {
  const connection = createQueueConnection();
  if (!connection) return null;

  return new Worker(
    STANDARD_QUEUES.DOCUMENTS_PARSE,
    async (job) => {
      const { documentId } = job.data;
      // TODO: call parse-only path on ingest service (not full upload)
      void deps;
      void documentId;
      throw new Error("parse-document worker not implemented");
    },
    { connection }
  );
}

void STANDARD_JOB_NAMES;
