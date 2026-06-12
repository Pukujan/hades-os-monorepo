function ensureFunction(fn, label) {
  if (typeof fn !== "function") {
    throw new Error(`${label} is not configured`);
  }
  return fn;
}

function extractCommandName(content = "") {
  const trimmed = String(content || "").trim();
  if (!trimmed) return null;
  const [firstToken] = trimmed.split(/\s+/);
  return firstToken || null;
}

function pickPrimaryOutboundAction(outboundActions = []) {
  return outboundActions.find((action) => action?.type === "send_message" || action?.type === "send_gif") || null;
}

export function createMinionAssignmentRuntime({
  verifySocialAccount,
  repository = {},
  hermesRuntime,
  socialClient
} = {}) {
  async function handleSocialTrigger({
    provider,
    accountId,
    channelId,
    messageId,
    content = "",
    triggerType = "command",
    scheduleId = null
  }) {
    const session = await ensureFunction(verifySocialAccount, "Social account verification")({
      provider,
      accountId
    });

    if (!session) {
      throw new Error("Social account is not connected or unauthenticated");
    }

    const commandName = triggerType === "schedule" ? null : extractCommandName(content);
    const assignment = await ensureFunction(repository?.findActiveAssignment, "Active assignment lookup")({
      userId: session.userId,
      tenantId: session.tenantId,
      provider,
      channelId,
      commandName,
      triggerType
    });

    if (!assignment) {
      return { status: "unassigned", reason: "no_active_assignment" };
    }

    const minion = await ensureFunction(repository?.getMinion, "Minion lookup")(assignment.minionId);
    if (!minion) {
      return { status: "unassigned", reason: "missing_minion" };
    }

    const commandTrigger = {
      provider,
      triggerType,
      commandName,
      content: content || null,
      scheduleId
    };

    const executionResult = await ensureFunction(hermesRuntime?.executeMinion, "Hermes minion runtime")({
      context: {
        userId: session.userId,
        tenantId: session.tenantId,
        provider,
        accountId,
        channelId,
        messageId
      },
      minion,
      assignment,
      trigger: commandTrigger
    });

    const primaryAction = pickPrimaryOutboundAction(executionResult?.outboundActions || []);
    const sendResult = await ensureFunction(socialClient?.sendMessage, "Social client")({
      provider,
      accountId,
      channelId,
      messageId,
      replyToMessageId: messageId,
      content: primaryAction?.content || executionResult?.assistantText || "",
      mediaUrl: primaryAction?.mediaUrl || null,
      gifUrl: primaryAction?.gifUrl || null
    });

    if (typeof repository?.saveAgentExecution === "function") {
      await repository.saveAgentExecution({
        execution: {
          userId: session.userId,
          tenantId: session.tenantId,
          provider,
          accountId,
          channelId,
          messageId,
          triggerType,
          commandName,
          minionId: minion.id,
          assignmentId: assignment.id,
          sessionId: executionResult?.sessionId || null,
          status: "sent",
          source: "minion_assignment_runtime",
          outboundActions: executionResult?.outboundActions || [],
          trigger: commandTrigger
        }
      });
    }

    return {
      status: "sent",
      minionId: minion.id,
      assignmentId: assignment.id,
      sessionId: executionResult?.sessionId || null,
      providerMessageId: sendResult?.providerMessageId || null
    };
  }

  return { handleSocialTrigger };
}
