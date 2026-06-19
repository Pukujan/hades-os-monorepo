import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("HermesWorkerPool", () => {
  test("creates pool with default config", async () => {
    const { createHermesWorkerPool } = await import("../../services/hermesWorkerPool.service.js");
    const pool = createHermesWorkerPool({ runCommand: async () => "output" });
    const stats = pool.getStats();
    assert.equal(typeof stats.active, "number");
    assert.equal(typeof stats.queued, "number");
    assert.equal(typeof stats.maxWorkers, "number");
    assert.equal(stats.isShuttingDown, false);
    await pool.shutdown();
  });

  test("creates pool with env var config", async () => {
    const prevMax = process.env.HERMES_WORKER_MAX;
    const prevTimeout = process.env.HERMES_WORKER_IDLE_TIMEOUT;
    const prevPerUser = process.env.HERMES_WORKER_PER_USER_MAX;
    process.env.HERMES_WORKER_MAX = "2";
    process.env.HERMES_WORKER_IDLE_TIMEOUT = "5000";
    process.env.HERMES_WORKER_PER_USER_MAX = "1";
    try {
      const { createHermesWorkerPool } = await import("../../services/hermesWorkerPool.service.js");
      const pool = createHermesWorkerPool({ runCommand: async () => "output" });
      const stats = pool.getStats();
      assert.equal(stats.maxWorkers, 2);
      assert.equal(stats.perUserMax, 1);
      await pool.shutdown();
    } finally {
      if (prevMax === undefined) delete process.env.HERMES_WORKER_MAX;
      else process.env.HERMES_WORKER_MAX = prevMax;
      if (prevTimeout === undefined) delete process.env.HERMES_WORKER_IDLE_TIMEOUT;
      else process.env.HERMES_WORKER_IDLE_TIMEOUT = prevTimeout;
      if (prevPerUser === undefined) delete process.env.HERMES_WORKER_PER_USER_MAX;
      else process.env.HERMES_WORKER_PER_USER_MAX = prevPerUser;
    }
  });

  test("execute passes through to runCommand when under limit", async () => {
    const { createHermesWorkerPool } = await import("../../services/hermesWorkerPool.service.js");
    const calls = [];
    const pool = createHermesWorkerPool({
      maxWorkers: 4,
      runCommand: async (bin, args, options) => {
        calls.push({ bin, args });
        return "result";
      },
    });

    const output = await pool.execute("/bin/hermes", ["--oneshot", "hi"], { encoding: "utf8" });
    assert.equal(output, "result");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].bin, "/bin/hermes");
    await pool.shutdown();
  });

  test("execute queues when at maxWorkers", async () => {
    const { createHermesWorkerPool } = await import("../../services/hermesWorkerPool.service.js");
    let active = 0;
    let maxObserved = 0;
    let release;
    const firstDone = new Promise((resolve) => { release = resolve; });

    const pool = createHermesWorkerPool({
      maxWorkers: 1,
      runCommand: async () => {
        active++;
        maxObserved = Math.max(maxObserved, active);
        await firstDone;
        active--;
        return "done";
      },
    });

    const result1 = pool.execute("/bin/hermes", ["--oneshot", "a"], { encoding: "utf8" });
    const stats1 = pool.getStats();
    assert.equal(stats1.active, 1);
    assert.equal(stats1.queued, 0);

    const result2 = pool.execute("/bin/hermes", ["--oneshot", "b"], { encoding: "utf8" });
    const stats2 = pool.getStats();
    assert.equal(stats2.active, 1);
    assert.equal(stats2.queued, 1);

    release();
    const [out1, out2] = await Promise.all([result1, result2]);
    assert.equal(out1, "done");
    assert.equal(out2, "done");
    assert.equal(maxObserved, 1);
    await pool.shutdown();
  });

  test("queued task runs when active completes", async () => {
    const { createHermesWorkerPool } = await import("../../services/hermesWorkerPool.service.js");
    const order = [];
    let release;
    const hold = new Promise((resolve) => { release = resolve; });

    const pool = createHermesWorkerPool({
      maxWorkers: 1,
      runCommand: async () => {
        order.push("start");
        await hold;
        order.push("end");
        return "done";
      },
    });

    pool.execute("/bin/hermes", ["a"], { encoding: "utf8" });
    const queuedPromise = pool.execute("/bin/hermes", ["b"], { encoding: "utf8" });
    assert.equal(pool.getStats().queued, 1);

    release();
    await queuedPromise;
    assert.equal(order.length, 4);
    assert.equal(order[0], "start");
    assert.equal(order[1], "end");
    assert.equal(order[2], "start");
    assert.equal(order[3], "end");
    assert.equal(pool.getStats().queued, 0);
    await pool.shutdown();
  });

  test("per-user concurrency cap blocks excess from same userId", async () => {
    const { createHermesWorkerPool } = await import("../../services/hermesWorkerPool.service.js");
    let release;
    const hold = new Promise((resolve) => { release = resolve; });

    const pool = createHermesWorkerPool({
      maxWorkers: 5,
      perUserMax: 1,
      runCommand: async () => {
        await hold;
        return "done";
      },
    });

    pool.execute("/bin/hermes", ["a"], { encoding: "utf8", userId: "user_a" });
    await assert.rejects(
      () => pool.execute("/bin/hermes", ["b"], { encoding: "utf8", userId: "user_a" }),
      /per-user|concurrency|limit/i
    );
    release();
    await pool.shutdown();
  });

  test("different users are not blocked by per-user cap", async () => {
    const { createHermesWorkerPool } = await import("../../services/hermesWorkerPool.service.js");
    let release;
    const hold = new Promise((resolve) => { release = resolve; });

    const pool = createHermesWorkerPool({
      maxWorkers: 5,
      perUserMax: 1,
      runCommand: async () => {
        await hold;
        return "done";
      },
    });

    const p1 = pool.execute("/bin/hermes", ["a"], { encoding: "utf8", userId: "user_a" });
    const p2 = pool.execute("/bin/hermes", ["b"], { encoding: "utf8", userId: "user_b" });
    assert.equal(pool.getStats().active, 2);

    release();
    const [r1, r2] = await Promise.all([p1, p2]);
    assert.equal(r1, "done");
    assert.equal(r2, "done");
    await pool.shutdown();
  });

  test("per-user cap is released after task completes", async () => {
    const { createHermesWorkerPool } = await import("../../services/hermesWorkerPool.service.js");

    const pool = createHermesWorkerPool({
      maxWorkers: 5,
      perUserMax: 1,
      runCommand: async () => "done",
    });

    await pool.execute("/bin/hermes", ["a"], { encoding: "utf8", userId: "user_a" });
    const second = await pool.execute("/bin/hermes", ["b"], { encoding: "utf8", userId: "user_a" });
    assert.equal(second, "done");
    await pool.shutdown();
  });

  test("shutdown rejects queued tasks", async () => {
    const { createHermesWorkerPool } = await import("../../services/hermesWorkerPool.service.js");
    let release;
    const hold = new Promise((resolve) => { release = resolve; });

    const pool = createHermesWorkerPool({
      maxWorkers: 1,
      runCommand: async () => {
        await hold;
        return "done";
      },
    });

    pool.execute("/bin/hermes", ["a"], { encoding: "utf8" });
    const queuedPromise = pool.execute("/bin/hermes", ["b"], { encoding: "utf8" });
    let rejectedWith;
    queuedPromise.catch((e) => { rejectedWith = e; });
    assert.equal(pool.getStats().queued, 1);

    await pool.shutdown(100);
    assert.equal(pool.getStats().isShuttingDown, true);
    assert.equal(pool.getStats().queued, 0);
    assert.ok(rejectedWith);
    assert.match(rejectedWith.message, /shut down/i);

    release();
  });

  test("shutdown waits for active tasks", async () => {
    const { createHermesWorkerPool } = await import("../../services/hermesWorkerPool.service.js");
    const order = [];
    let release;
    const hold = new Promise((resolve) => { release = resolve; });

    const pool = createHermesWorkerPool({
      maxWorkers: 2,
      runCommand: async () => {
        order.push("start");
        await hold;
        order.push("end");
        return "done";
      },
    });

    const activePromise = pool.execute("/bin/hermes", ["a"], { encoding: "utf8" });
    assert.equal(pool.getStats().active, 1);

    const shutdownPromise = pool.shutdown(5000);
    await new Promise((r) => setImmediate(r));
    assert.equal(order.includes("end"), false, "should not complete until hold releases");

    release();
    await Promise.all([activePromise, shutdownPromise]);
    assert.equal(order[order.length - 1], "end");
    assert.equal(pool.getStats().active, 0);
  });

  test("getStats returns current pool state", async () => {
    const { createHermesWorkerPool } = await import("../../services/hermesWorkerPool.service.js");
    const pool = createHermesWorkerPool({
      maxWorkers: 3,
      runCommand: async () => "done",
    });

    let stats = pool.getStats();
    assert.equal(stats.active, 0);
    assert.equal(stats.queued, 0);
    assert.equal(stats.maxWorkers, 3);
    assert.equal(stats.perUserMax, 2);
    assert.equal(typeof stats.lastActivity, "number");
    assert.equal(stats.idleTimeoutMs, 60000);
    assert.equal(stats.isShuttingDown, false);

    await pool.execute("/bin/hermes", ["a"], { encoding: "utf8" });
    stats = pool.getStats();
    assert.equal(stats.active, 0);
    assert.ok(typeof stats.lastActivity === "number");

    await pool.shutdown();
    stats = pool.getStats();
    assert.equal(stats.isShuttingDown, true);
  });

  test("idle timeout callback fires after inactivity", async () => {
    const { createHermesWorkerPool } = await import("../../services/hermesWorkerPool.service.js");
    let idleFired = false;
    let idleDuration = 0;

    const pool = createHermesWorkerPool({
      maxWorkers: 2,
      idleTimeoutMs: 50,
      onIdleTimeout: (ms) => {
        idleFired = true;
        idleDuration = ms;
      },
      runCommand: async () => "done",
    });

    await pool.execute("/bin/hermes", ["a"], { encoding: "utf8" });
    await new Promise((r) => setTimeout(r, 150));
    assert.equal(idleFired, true);
    assert.ok(idleDuration >= 50);
    pool._clearIdleTimer();
  });
});
