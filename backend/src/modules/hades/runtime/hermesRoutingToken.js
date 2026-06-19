import { randomUUID, createHmac, timingSafeEqual } from "node:crypto";

function base64url(buf) {
  return buf.toString("base64url");
}

function fromBase64url(str) {
  return Buffer.from(str, "base64url");
}

export function createHermesRoutingTokenService({ secret, repository } = {}) {
  function encode(payload) {
    const encoded = base64url(Buffer.from(JSON.stringify(payload)));
    const sig = createHmac("sha256", secret).update(encoded).digest();
    return encoded + "." + base64url(sig);
  }

  function decode(token) {
    const dot = token.indexOf(".");
    if (dot === -1) throw new Error("Invalid token format");
    const encoded = token.slice(0, dot);
    const sig = fromBase64url(token.slice(dot + 1));
    const expected = createHmac("sha256", secret).update(encoded).digest();
    if (!timingSafeEqual(sig, expected)) {
      throw new Error("Invalid token signature");
    }
    return JSON.parse(fromBase64url(encoded).toString());
  }

  async function issueTask({ userId, tenantId, processId, destination, workspaceId, capabilities, ...extra } = {}) {
    const taskId = randomUUID();
    const payload = {
      taskId, userId, tenantId, processId,
      ...(destination ? { destination } : {}),
      ...(workspaceId ? { workspaceId } : {}),
      ...(capabilities ? { capabilities } : {}),
      ...extra,
      iat: Date.now(),
    };
    const routingToken = encode(payload);

    if (repository) {
      await repository.createTaskRoute({
        taskId, userId, tenantId, processId,
        routingToken,
        routingTokenHash: createHmac("sha256", secret).update(routingToken).digest("hex"),
        destination,
      });
    }

    return { taskId, routingToken };
  }

  async function verifyResponse({ taskId, routingToken, processId, userId, tenantId, workspaceId } = {}) {
    let payload;
    try {
      payload = decode(routingToken);
    } catch {
      throw new Error("Invalid route: token rejection");
    }

    if (payload.taskId !== taskId) {
      throw new Error("Invalid route: task mismatch");
    }
    if (payload.userId !== userId) {
      throw new Error("Invalid route: user mismatch");
    }
    if (payload.tenantId !== tenantId) {
      throw new Error("Invalid route: tenant mismatch");
    }
    if (payload.processId !== processId) {
      throw new Error("Invalid route: process/lineage mismatch");
    }
    if (workspaceId && payload.workspaceId && payload.workspaceId !== workspaceId) {
      throw new Error("Invalid route: workspace/scope mismatch");
    }

    return {
      taskId: payload.taskId,
      userId: payload.userId,
      tenantId: payload.tenantId,
      processId: payload.processId,
      destination: payload.destination || null,
      capabilities: payload.capabilities || payload.capabilityEnvelope || [],
      workspaceId: payload.workspaceId || null,
    };
  }

  return { issueTask, verifyResponse };
}
