import IORedis from "ioredis";
import { REDIS_URL_ENV } from "../contracts/asyncJobQueue.contract.js";

/**
 * @returns {import("ioredis").default | null}
 */
export function createQueueConnection(env = process.env) {
  if (env.QUEUE_DISABLED === "true") return null;
  const url = env[REDIS_URL_ENV]?.trim();
  if (!url) return null;
  return new IORedis(url, { maxRetriesPerRequest: null });
}

export function isQueueEnabled(env = process.env) {
  return env.QUEUE_DISABLED !== "true" && Boolean(env[REDIS_URL_ENV]?.trim());
}
