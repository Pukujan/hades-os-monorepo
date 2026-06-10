/**
 * Template — copy to backend/src/shared/queue/createQueueConnection.js
 * Contract: asyncJobQueue v001
 */
import IORedis from "ioredis";
import { REDIS_URL_ENV } from "../contracts/asyncJobQueue.contract.js";

/**
 * @returns {import("ioredis").default | null}
 */
export function createQueueConnection(env = process.env) {
  const url = env[REDIS_URL_ENV]?.trim();
  if (!url) return null;
  return new IORedis(url, { maxRetriesPerRequest: null });
}
