import { randomUUID, createHmac } from "node:crypto";

export function createHermesRoutingTokenService({ secret, repository } = {}) {
  const tasks = new Map();

  function sign(payload) {
    return createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
  }

  async function issueTask({ userId, tenantId, processId, destination }) {
    const taskId = randomUUID();
    const payload = { taskId, userId, tenantId, processId };
    const routingToken = sign(payload);
    tasks.set(taskId, { userId, tenantId, processId, destination, routingToken });

    if (repository) {
      await repository.createTaskRoute({
        taskId,
        userId,
        tenantId,
        processId,
        routingToken,
        routingTokenHash: routingToken,
        destination,
      });
    }

    return { taskId, routingToken };
  }

  async function verifyResponse({ taskId, routingToken, processId, userId, tenantId }) {
    let stored = tasks.get(taskId);

    if (!stored && repository) {
      const route = await repository.findTaskRoute({ taskId, userId, tenantId });
      if (route) {
        const routeProcessId = route.processId || route.process_id;
        const payload = { taskId, userId, tenantId, processId: routeProcessId };
        const computedHash = sign(payload);
        if (computedHash !== routingToken) {
          throw new Error("Invalid route: token mismatch");
        }
        return { userId: route.userId || route.user_id, tenantId: route.tenantId || route.tenant_id, destination: route.destination };
      }
    }

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
