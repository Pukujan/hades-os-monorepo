import { randomUUID } from "node:crypto";

export function createWorkflowAuditRepository() {
  const toolCalls = [];

  async function recordToolCall({ id, userId, tenantId, workflowRunId, toolName, status, metadata } = {}) {
    const record = {
      id: id || randomUUID(),
      user_id: userId,
      tenant_id: tenantId,
      workflow_run_id: workflowRunId,
      tool_name: toolName,
      status: status || "pending",
      metadata: metadata || null,
      created_at: new Date().toISOString(),
    };
    toolCalls.push(record);
    return record;
  }

  async function listToolCalls({ userId, tenantId, workflowRunId } = {}) {
    return toolCalls.filter(
      (tc) =>
        (userId == null || tc.user_id === userId) &&
        (tenantId == null || tc.tenant_id === tenantId) &&
        (workflowRunId == null || tc.workflow_run_id === workflowRunId)
    );
  }

  return { recordToolCall, listToolCalls };
}
