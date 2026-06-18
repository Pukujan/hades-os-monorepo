import { persistTable, readTableRows } from "./_supabase.js";
import { randomUUID } from "node:crypto";

export function createApprovalRepository({ storage = "memory", supabaseClient, tableName = "hades_extension_approvals" } = {}) {
  const approvals = new Map();
  let hydrated = false;

  async function hydrate() {
    if (storage !== "supabase" || hydrated) return;
    hydrated = true;
    for (const row of await readTableRows(supabaseClient, tableName)) {
      if (!row?.id) continue;
      approvals.set(row.id, { ...row });
    }
  }

  async function persist(row, mode = "upsert") {
    if (storage === "supabase") {
      await persistTable(supabaseClient, tableName, mode, row);
    }
  }

  async function create({ userId, tenantId, actionType, description, payload, toolName, input, workflowId, workflow_run_id, tool_call_id, status, ...rest }) {
    await hydrate();
    const id = randomUUID();
    const normalizedActionType = actionType || toolName || null;
    const record = {
      id,
      user_id: userId,
      tenant_id: tenantId,
      action_type: normalizedActionType,
      description: description || (toolName ? `Approval for tool: ${toolName}` : null),
      payload: payload || { workflowId, toolName, input, ...rest },
      workflow_run_id: workflow_run_id || rest.workflow_run_id || null,
      tool_call_id: tool_call_id || rest.toolCallId || rest.tool_call_id || null,
      status: status || "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    approvals.set(id, record);
    await persist(record, "insert");
    return record;
  }

  async function listPending({ userId, tenantId }) {
    await hydrate();
    return [...approvals.values()].filter(
      (r) => r.user_id === userId && r.tenant_id === tenantId && r.status === "pending"
    ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  async function findApprovedForRun(runId) {
    await hydrate();
    return [...approvals.values()]
      .filter((r) => r.workflow_run_id === runId && r.status === "approved")
      .map((r) => ({ toolCallId: r.tool_call_id, status: r.status }));
  }

  async function decide({ id, userId, tenantId, status }) {
    await hydrate();
    const record = approvals.get(id) || null;
    if (!record) return null;
    if (record.user_id !== userId || record.tenant_id !== tenantId) return null;
    record.status = status;
    record.updated_at = new Date().toISOString();
    approvals.set(id, record);
    await persist(record);
    return record;
  }

  return { create, listPending, findApprovedForRun, decide };
}
