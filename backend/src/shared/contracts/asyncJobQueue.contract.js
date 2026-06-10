/** @readonly Async background jobs — BullMQ + Redis (free OSS). */

export const ASYNC_JOB_QUEUE_VERSION = "v001";

/** Primary queue implementation for this platform. */
export const QUEUE_BACKEND = "bullmq";

/** Env var for BullMQ / Redis connection. */
export const REDIS_URL_ENV = "REDIS_URL";

/** Optional alternative documented in contract (Postgres-only). */
export const QUEUE_BACKEND_ALTERNATIVE = "pg-boss";

/** Standard queue names — pattern: {module}.{verb} */
export const STANDARD_QUEUES = {
  DOCUMENTS_PARSE: "documents.parse",
  AGENTS_RUN_ACTION: "agents.run-action"
};

/** Default BullMQ job options when implementing workers. */
export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential", delay: 5000 },
  removeOnComplete: 100,
  removeOnFail: 500
};

/** Job names inside a queue (BullMQ `name` field). */
export const STANDARD_JOB_NAMES = {
  PARSE_DOCUMENT: "parse-document",
  RUN_AGENT_ACTION: "run-agent-action"
};

/**
 * @param {string} moduleName
 * @param {string} verb
 * @returns {string}
 */
export function queueName(moduleName, verb) {
  return `${moduleName}.${verb}`;
}
