function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function stripSecrets(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const str = JSON.stringify(obj);
  const cleaned = str.replace(/"botToken"\s*:\s*"[^"]*"/g, '"botToken":"[REDACTED]"');
  const cleaned2 = cleaned.replace(/"encrypted_bot_token"\s*:\s*"[^"]*"/g, '"encrypted_bot_token":"[REDACTED]"');
  try {
    return JSON.parse(cleaned2);
  } catch {
    return obj;
  }
}

export function createAgentExecutionRepository({ storage = "memory" } = {}) {
  const executions = new Map();

  async function create({ userId, tenantId, data }) {
    const safeData = stripSecrets(data);
    const record = {
      ...safeData,
      id: safeData.id || createId("exec"),
      user_id: userId,
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
    };
    executions.set(record.id, record);
    return record;
  }

  async function findById({ id, userId, tenantId }) {
    const record = executions.get(id) || null;
    if (!record) return null;
    if (record.user_id !== userId || record.tenant_id !== tenantId) return null;
    return record;
  }

  async function listByUser({ userId, tenantId }) {
    return [...executions.values()].filter(
      (e) => e.user_id === userId && e.tenant_id === tenantId
    );
  }

  return { create, findById, listByUser };
}
