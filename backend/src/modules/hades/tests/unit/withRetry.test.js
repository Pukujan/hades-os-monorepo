import { test, describe, mock } from "node:test";
import assert from "node:assert/strict";

async function loadWithRetry() {
  try {
    return await import("../../utils/withRetry.js");
  } catch (error) {
    throw new Error(
      [
        "Missing withRetry utility.",
        "Implement backend/src/modules/hades/utils/withRetry.js",
        "and export { withRetry }.",
      ].join(" "),
      { cause: error }
    );
  }
}

describe("withRetry", () => {
  test("returns result on first success", async () => {
    const { withRetry } = await loadWithRetry();

    const fn = mock.fn(async () => "ok");
    const wrapped = withRetry(fn, { retries: 2 });

    const result = await wrapped();
    assert.equal(result, "ok");
    assert.equal(fn.mock.callCount(), 1);
  });

  test("retries on network error then succeeds", async () => {
    const { withRetry } = await loadWithRetry();

    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 2) throw new TypeError("fetch failed");
      return "recovered";
    };
    const wrapped = withRetry(fn, { retries: 2, minDelay: 10, maxDelay: 50 });

    const result = await wrapped();
    assert.equal(result, "recovered");
    assert.equal(attempts, 2);
  });

  test("fails after all retries exhausted", async () => {
    const { withRetry } = await loadWithRetry();

    const fn = mock.fn(async () => { throw new Error("persistent error"); });
    const wrapped = withRetry(fn, { retries: 1, minDelay: 10, maxDelay: 50 });

    await assert.rejects(() => wrapped(), /persistent error/);
    assert.equal(fn.mock.callCount(), 2);
  });

  test("does NOT retry on HTTP 4xx client errors", async () => {
    const { withRetry } = await loadWithRetry();

    const fn = mock.fn(async () => ({
      ok: false,
      status: 404,
    }));
    const wrapped = withRetry(fn, { retries: 2, minDelay: 10, maxDelay: 50 });

    const result = await wrapped();
    assert.equal(result.status, 404);
    assert.equal(fn.mock.callCount(), 1);
  });

  test("retries on HTTP 429 rate limit", async () => {
    const { withRetry } = await loadWithRetry();

    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 2) return { ok: false, status: 429 };
      return { ok: true, status: 200 };
    };
    const wrapped = withRetry(fn, { retries: 2, minDelay: 10, maxDelay: 50 });

    const result = await wrapped();
    assert.equal(result.status, 200);
    assert.equal(attempts, 2);
  });

  test("retries on HTTP 5xx server errors", async () => {
    const { withRetry } = await loadWithRetry();

    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 2) return { ok: false, status: 502 };
      return { ok: true, status: 200 };
    };
    const wrapped = withRetry(fn, { retries: 2, minDelay: 10, maxDelay: 50 });

    const result = await wrapped();
    assert.equal(result.status, 200);
    assert.equal(attempts, 2);
  });

  test("supports custom retries count", async () => {
    const { withRetry } = await loadWithRetry();

    const fn = mock.fn(async () => { throw new Error("fail"); });
    const wrapped = withRetry(fn, { retries: 3, minDelay: 10, maxDelay: 50 });

    await assert.rejects(() => wrapped(), /fail/);
    assert.equal(fn.mock.callCount(), 4);
  });

  test("uses default options when none provided", async () => {
    const { withRetry } = await loadWithRetry();

    const fn = mock.fn(async () => "defaults");
    const wrapped = withRetry(fn);

    const result = await wrapped();
    assert.equal(result, "defaults");
  });
});
