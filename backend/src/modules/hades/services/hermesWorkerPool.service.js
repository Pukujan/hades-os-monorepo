function parsePositiveInteger(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const defaultRunCommand = () =>
  Promise.reject(new Error("No runCommand provided to worker pool"));

export function createHermesWorkerPool({
  maxWorkers = parsePositiveInteger(process.env.HERMES_WORKER_MAX, 4),
  idleTimeoutMs = parsePositiveInteger(process.env.HERMES_WORKER_IDLE_TIMEOUT, 60000),
  perUserMax = parsePositiveInteger(process.env.HERMES_WORKER_PER_USER_MAX, 2),
  onIdleTimeout,
  runCommand = defaultRunCommand,
} = {}) {
  let activeCount = 0;
  const perUserCount = new Map();
  const queue = [];
  let shutdownRequested = false;
  let lastActivity = Date.now();

  function getUserId(options) {
    return (options && options.userId) || "anonymous";
  }

  async function execute(bin, args, options) {
    if (shutdownRequested) {
      throw new Error("Worker pool is shutting down");
    }

    const userId = getUserId(options);

    const currentUserCount = perUserCount.get(userId) || 0;
    if (currentUserCount >= perUserMax) {
      throw new Error(
        `Per-user concurrency limit (${perUserMax}) reached for user ${userId}`
      );
    }

    lastActivity = Date.now();

    if (activeCount >= maxWorkers) {
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject, bin, args, options, userId });
      });
    }

    return runTask(bin, args, options, userId);
  }

  async function runTask(bin, args, options, userId) {
    activeCount++;
    perUserCount.set(userId, (perUserCount.get(userId) || 0) + 1);

    try {
      return await runCommand(bin, args, options);
    } finally {
      activeCount--;
      const newCount = Math.max(0, (perUserCount.get(userId) || 1) - 1);
      perUserCount.set(userId, newCount);
      processQueue();
    }
  }

  function processQueue() {
    while (queue.length > 0 && activeCount < maxWorkers) {
      const next = queue.shift();
      runTask(next.bin, next.args, next.options, next.userId).then(
        next.resolve,
        next.reject
      );
    }
  }

  function getStats() {
    return {
      active: activeCount,
      queued: queue.length,
      maxWorkers,
      perUserMax,
      idleTimeoutMs,
      lastActivity,
      isShuttingDown: shutdownRequested,
    };
  }

  async function shutdown(timeoutMs = 30000) {
    shutdownRequested = true;
    clearInterval(idleTimer);

    for (const item of queue) {
      item.reject(new Error("Worker pool shut down"));
    }
    queue.length = 0;

    const start = Date.now();
    while (activeCount > 0 && Date.now() - start < timeoutMs) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  }

  const idleTimer = setInterval(() => {
    if (activeCount === 0 && queue.length === 0 && !shutdownRequested) {
      const idleTime = Date.now() - lastActivity;
      if (idleTime >= idleTimeoutMs && typeof onIdleTimeout === "function") {
        onIdleTimeout(idleTime);
      }
    }
  }, Math.min(idleTimeoutMs / 2, 10000));

  function _clearIdleTimer() {
    clearInterval(idleTimer);
  }

  return { execute, getStats, shutdown, _clearIdleTimer };
}
