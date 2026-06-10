import { randomUUID } from "crypto";

/**
 * @param {string} [prefix]
 * @returns {string}
 */
export function createTraceId(prefix = "trace") {
  const short = randomUUID().replace(/-/g, "").slice(0, 12);
  return `${prefix}_${short}`;
}

/**
 * @param {string} batchTraceId
 * @param {number} docIndex
 * @returns {string}
 */
export function docTraceId(batchTraceId, docIndex) {
  return `${batchTraceId}_doc${String(docIndex).padStart(3, "0")}`;
}
