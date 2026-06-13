function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createAssignmentRepository({ storage = "memory" } = {}) {
  const assignments = new Map();

  async function create({ userId, tenantId, data }) {
    const record = {
      ...data,
      id: data.id || createId("assign"),
      user_id: userId,
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    assignments.set(record.id, record);
    return record;
  }

  async function findActiveAssignment({ userId, tenantId, provider, commandName }) {
    for (const record of assignments.values()) {
      if (record.user_id !== userId) continue;
      if (record.tenant_id !== tenantId) continue;
      if (record.status !== "active") continue;
      if (provider && record.provider !== provider) continue;
      if (commandName != null && record.command_name !== commandName) continue;
      return record;
    }
    return null;
  }

  async function findById({ id, userId, tenantId }) {
    const record = assignments.get(id) || null;
    if (!record) return null;
    if (record.user_id !== userId || record.tenant_id !== tenantId) return null;
    return record;
  }

  async function listByUser({ userId, tenantId }) {
    return [...assignments.values()].filter(
      (a) => a.user_id === userId && a.tenant_id === tenantId
    );
  }

  async function update({ id, userId, tenantId, patch }) {
    const record = assignments.get(id) || null;
    if (!record) return null;
    if (record.user_id !== userId || record.tenant_id !== tenantId) return null;
    const updated = { ...record, ...patch, updated_at: new Date().toISOString() };
    assignments.set(id, updated);
    return updated;
  }

  async function remove({ id, userId, tenantId }) {
    const record = assignments.get(id) || null;
    if (!record) return false;
    if (record.user_id !== userId || record.tenant_id !== tenantId) return false;
    assignments.delete(id);
    return true;
  }

  return { create, findActiveAssignment, findById, listByUser, update, delete: remove };
}
