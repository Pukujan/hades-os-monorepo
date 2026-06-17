export function createDurableWorkflowOrchestrator({
  runStateRepository,
  planner,
  toolRegistry,
  approvalRepository,
}) {
  return {
    async resumeRun({ runId, authContext }) {
      const { userId, tenantId } = authContext;

      const recovered = await runStateRepository.recoverRun({
        runId,
        userId,
        tenantId,
      });

      if (!recovered) {
        throw new Error("Run not found or access denied");
      }

      const completedToolCallIds = new Set(recovered.completedToolCallIds || []);
      const approvedCalls = await approvalRepository.findApprovedForRun(runId);
      const approvedToolCallIds = new Set(
        (approvedCalls || [])
          .filter((a) => a.status === "approved")
          .map((a) => a.toolCallId),
      );

      const plan = await planner.plan({});
      const toolCallsToExecute = (plan.toolCalls || []).filter(
        (tc) => !completedToolCallIds.has(tc.id) && approvedToolCallIds.has(tc.id),
      );

      const executed = [];

      for (const toolCall of toolCallsToExecute) {
        const tool = toolRegistry.get(toolCall.toolName);
        if (!tool) continue;

        if (tool.requiresApproval && !approvedToolCallIds.has(toolCall.id)) {
          continue;
        }

        await tool.execute(toolCall.input);
        executed.push(toolCall.toolName);

        await runStateRepository.appendCheckpoint({
          runId,
          userId,
          tenantId,
          checkpoint: {
            stepId: toolCall.id,
            status: "completed",
            cursor: { nextStepId: null },
            snapshot: {},
          },
        });
      }

      return { status: "completed", executed };
    },
  };
}
