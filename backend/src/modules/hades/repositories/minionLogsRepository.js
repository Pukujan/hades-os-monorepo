import { randomUUID } from "crypto";

function nowIso() {
  return new Date().toISOString();
}

export function createMinionLogsRepository({ tenantId } = {}) {
  const logs = [];

  async function insertLog({ minionId, level, summary, details } = {}) {
    const entry = {
      id: randomUUID().slice(0, 8),
      minionId,
      level,
      summary,
      details: details || null,
      tenantId,
      createdAt: nowIso(),
    };
    logs.push(entry);
    return JSON.parse(JSON.stringify(entry));
  }

  async function listLogsByMinionId(minionId, { limit, offset } = {}) {
    const sorted = logs
      .filter((l) => l.minionId === minionId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (offset !== undefined || limit !== undefined) {
      const start = offset || 0;
      const end = limit !== undefined ? start + limit : undefined;
      return sorted.slice(start, end).map((l) => ({ ...l }));
    }
    return sorted.map((l) => ({ ...l }));
  }

  async function getLog(id) {
    const entry = logs.find((l) => l.id === id) || null;
    return entry ? { ...entry } : null;
  }

  return {
    insertLog,
    listLogsByMinionId,
    getLog,
  };
}
