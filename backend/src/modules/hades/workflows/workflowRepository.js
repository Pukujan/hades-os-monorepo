import { randomUUID } from "node:crypto";
import { persistTable, readTableRows } from "../repositories/_supabase.js";

export function createWorkflowRepository({ storage = "memory", supabaseClient, definitionsTableName = "hades_workflow_definitions", runsTableName = "hades_workflow_runs" } = {}) {
  const definitions = new Map();
  const runs = new Map();
  let hydrated = false;

  async function hydrate() {
    if (storage !== "supabase" || hydrated) return;
    hydrated = true;
    for (const row of await readTableRows(supabaseClient, definitionsTableName)) {
      if (!row?.id) continue;
      definitions.set(row.id, { ...row });
    }
    for (const row of await readTableRows(supabaseClient, runsTableName)) {
      if (!row?.id) continue;
      runs.set(row.id, { ...row });
    }
  }

  async function persistDef(row, mode = "upsert") {
    if (storage === "supabase") {
      await persistTable(supabaseClient, definitionsTableName, mode, row);
    }
  }

  async function persistRun(row) {
    if (storage === "supabase") {
      await persistTable(supabaseClient, runsTableName, "insert", row);
    }
  }

  async function createDefinition({ userId, tenantId, data }) {
    await hydrate();
    const record = {
      ...data,
      id: data.id || randomUUID(),
      user_id: userId,
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    definitions.set(record.id, record);
    await persistDef(record);
    return record;
  }

  async function listDefinitions({ userId, tenantId }) {
    await hydrate();
    return [...definitions.values()].filter(
      (d) => d.user_id === userId && d.tenant_id === tenantId
    );
  }

  async function findDefinitionById({ id, userId, tenantId }) {
    await hydrate();
    const record = definitions.get(id) || null;
    if (!record) return null;
    if (record.user_id !== userId || record.tenant_id !== tenantId) return null;
    return record;
  }

  async function updateDefinition({ id, userId, tenantId, patch }) {
    await hydrate();
    const record = definitions.get(id) || null;
    if (!record) return null;
    if (record.user_id !== userId || record.tenant_id !== tenantId) return null;
    const updated = { ...record, ...patch, updated_at: new Date().toISOString() };
    definitions.set(id, updated);
    await persistDef(updated);
    return updated;
  }

  async function removeDefinition({ id, userId, tenantId }) {
    await hydrate();
    const record = definitions.get(id) || null;
    if (!record) return false;
    if (record.user_id !== userId || record.tenant_id !== tenantId) return false;
    definitions.delete(id);
    return true;
  }

  async function createRun({ userId, tenantId, data }) {
    await hydrate();
    const record = {
      ...data,
      id: data.id || randomUUID(),
      user_id: userId,
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
    };
    runs.set(record.id, record);
    await persistRun(record);
    return record;
  }

  async function listRuns({ userId, tenantId, workflowDefinitionId }) {
    await hydrate();
    return [...runs.values()].filter(
      (r) => r.user_id === userId && r.tenant_id === tenantId && (workflowDefinitionId == null || r.workflow_definition_id === workflowDefinitionId)
    );
  }

  return {
    createDefinition, listDefinitions, findDefinitionById, updateDefinition, delete: removeDefinition,
    createRun, listRuns,
  };
}
