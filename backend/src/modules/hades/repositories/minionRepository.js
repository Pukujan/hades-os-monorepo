function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createMinionRepository({ storage = "memory" } = {}) {
  const minions = new Map();

  async function create({ userId, tenantId, data }) {
    const record = {
      ...data,
      id: data.id || createId("minion"),
      user_id: userId,
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    minions.set(record.id, record);
    return record;
  }

  async function findById({ id, userId, tenantId }) {
    const record = minions.get(id) || null;
    if (!record) return null;
    if (record.user_id !== userId || record.tenant_id !== tenantId) return null;
    return record;
  }

  async function listByUser({ userId, tenantId }) {
    return [...minions.values()].filter(
      (m) => m.user_id === userId && m.tenant_id === tenantId
    );
  }

  async function update({ id, userId, tenantId, patch }) {
    const record = minions.get(id) || null;
    if (!record) return null;
    if (record.user_id !== userId || record.tenant_id !== tenantId) return null;
    const updated = { ...record, ...patch, updated_at: new Date().toISOString() };
    minions.set(id, updated);
    return updated;
  }

  async function remove({ id, userId, tenantId }) {
    const record = minions.get(id) || null;
    if (!record) return false;
    if (record.user_id !== userId || record.tenant_id !== tenantId) return false;
    minions.delete(id);
    return true;
  }

  return { create, findById, listByUser, update, delete: remove };
}
