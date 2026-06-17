import { randomUUID } from "node:crypto";

export function createWorkflowOrchestrator({ hermesPlanner, toolRegistry, approvalRepository, auditRepository } = {}) {
  async function run({ authContext, workflow, input }) {
    const plan = await hermesPlanner.plan({ workflow, input });

    const auditEntries = [];
    const approvalRequests = [];
    const toolResults = [];

    for (const toolCall of (plan.toolCalls || [])) {
      const toolDef = toolRegistry.get(toolCall.toolName);

      if (!toolDef) {
        auditEntries.push({
          id: randomUUID(),
          toolName: toolCall.toolName,
          status: "skipped",
          reason: "tool_not_found",
        });
        continue;
      }

      const requiresApproval = toolDef.requiresApproval === true
        || (workflow?.approvalPolicy?.requireApprovalFor || []).includes(toolCall.toolName);

      if (requiresApproval) {
        const approvalRequest = await approvalRepository.create({
          workflowId: workflow.id,
          toolName: toolCall.toolName,
          input: toolCall.input,
          status: "pending",
          userId: authContext.userId,
          tenantId: authContext.tenantId,
          createdAt: new Date().toISOString(),
        });

        approvalRequests.push(approvalRequest);

        auditEntries.push({
          id: randomUUID(),
          workflowId: workflow.id,
          toolName: toolCall.toolName,
          status: "paused_for_approval",
          userId: authContext.userId,
          tenantId: authContext.tenantId,
          createdAt: new Date().toISOString(),
        });

        continue;
      }

      const result = await toolDef.execute(toolCall.input);
      toolResults.push({ toolName: toolCall.toolName, result });

      auditEntries.push({
        id: randomUUID(),
        workflowId: workflow.id,
        toolName: toolCall.toolName,
        status: result.ok ? "completed" : "failed",
        userId: authContext.userId,
        tenantId: authContext.tenantId,
        createdAt: new Date().toISOString(),
      });
    }

    for (const entry of auditEntries) {
      await auditRepository.create(entry);
    }

    if (approvalRequests.length > 0) {
      return {
        status: "approval_required",
        approvalRequests,
        auditEntries,
        toolResults,
      };
    }

    return {
      status: "completed",
      approvalRequests,
      auditEntries,
      toolResults,
    };
  }

  return { run };
}
