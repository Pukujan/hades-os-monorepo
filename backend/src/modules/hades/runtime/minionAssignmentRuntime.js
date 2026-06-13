export function createMinionAssignmentRuntime({
  verifySocialAccount,
  assignmentRepository,
  minionRepository,
  hermesRuntime,
  socialClient,
  executionRepository,
  outputValidator,
} = {}) {
  async function handleSocialTrigger({
    provider,
    accountId,
    channelId,
    messageId,
    content = "",
    triggerType = "command",
    commandName,
    scheduleId = null,
  }) {
    const session = await verifySocialAccount({ provider, accountId });

    if (!session || session.ok === false) {
      return { ok: false, code: session?.code || "unknown_social_account" };
    }

    const cmdName = commandName || (content ? content.trim().split(/\s+/)[0] : null);

    const assignment = await assignmentRepository.findActiveAssignment({
      userId: session.userId,
      tenantId: session.tenantId,
      provider,
      commandName: cmdName,
    });

    if (!assignment) {
      return { ok: false, code: "no_assigned_minion" };
    }

    const minion = await minionRepository.findById({
      id: assignment.minion_id,
      userId: session.userId,
      tenantId: session.tenantId,
    });

    if (!minion) {
      return { ok: false, code: "minion_not_found" };
    }

    const commandTrigger = {
      provider,
      triggerType,
      commandName: cmdName,
      content: content || null,
      scheduleId,
    };

    let executionResult;
    try {
      executionResult = await hermesRuntime.executeMinion({
        context: {
          userId: session.userId,
          tenantId: session.tenantId,
          provider,
          accountId,
          channelId,
          messageId,
        },
        minion,
        assignment,
        trigger: commandTrigger,
      });
    } catch {
      return { ok: false, code: "hermes_execution_failed" };
    }

    if (outputValidator) {
      const validation = outputValidator({
        output: executionResult,
        authContext: { userId: session.userId, tenantId: session.tenantId },
        assignment,
        allowedActions: ["send_message", "send_gif"],
      });
      if (!validation.ok) {
        return { ok: false, code: "invalid_hermes_output" };
      }
    }

    let sendResult;
    try {
      sendResult = await socialClient.sendMessage({
        provider,
        connectionId: session.connectionId,
        accountId,
        channelId,
        messageId,
        replyToMessageId: messageId,
        content: executionResult?.assistantText || executionResult?.outboundActions?.[0]?.content || "",
      });
    } catch {
      return { ok: false, code: "social_send_failed" };
    }

    if (sendResult && sendResult.ok === false) {
      return { ok: false, code: "social_send_failed" };
    }

    if (executionRepository?.create) {
      await executionRepository.create({
        userId: session.userId,
        tenantId: session.tenantId,
        data: {
          provider,
          trigger_type: triggerType,
          minion_id: minion.id,
          assignment_id: assignment.id,
          status: "sent",
        },
      });
    }

    return { ok: true, status: "sent", minionId: minion.id, assignmentId: assignment.id };
  }

  return { handleSocialTrigger };
}
