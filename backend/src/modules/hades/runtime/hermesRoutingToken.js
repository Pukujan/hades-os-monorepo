import { randomUUID, createHmac } from "node:crypto";

export function createHermesRoutingTokenService({ secret }) {
  const tasks = new Map();

  function sign(payload) {
    return createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
  }

  async function issueTask({ userId, tenantId, processId, destination }) {
    const taskId = randomUUID();
    const payload = { taskId, userId, tenantId, processId };
    const routingToken = sign(payload);
    tasks.set(taskId, { userId, tenantId, processId, destination, routingToken });
    return { taskId, routingToken };
  }

  async function verifyResponse({ taskId, routingToken, processId, userId, tenantId }) {
    const stored = tasks.get(taskId);
    if (!stored) {
      throw new Error("Invalid route: task not found");
    }
    if (stored.routingToken !== routingToken) {
      throw new Error("Invalid route: token mismatch");
    }
    if (stored.processId !== processId) {
      throw new Error("Invalid route: process mismatch");
    }
    if (stored.userId !== userId) {
      throw new Error("Invalid route: user mismatch");
    }
    if (stored.tenantId !== tenantId) {
      throw new Error("Invalid route: tenant mismatch");
    }
    return { userId: stored.userId, tenantId: stored.tenantId, destination: stored.destination };
  }

  return { issueTask, verifyResponse };
}
