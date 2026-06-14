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
  socialClient,
  scopedRepos
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

    if (!session || session.ok === false) {
      throw Object.assign(
        new Error(session?.code === "unknown_social_account" ? "Social account not found" : "Social account is not connected or unauthenticated"),
        { code: session?.code || "unauthenticated", status: session?.code === "unknown_social_account" ? 404 : 401 }
      );
    }

    const commandName = triggerType === "schedule" ? null : extractCommandName(content);

    const activeAssignment = scopedRepos?.assignments
      ? await scopedRepos.assignments.findActiveAssignment({
          userId: session.userId,
          tenantId: session.tenantId,
          provider,
          channelId,
          commandName,
          triggerType
        })
      : null;

    const assignment = activeAssignment || await ensureFunction(repository?.findActiveAssignment, "Active assignment lookup")({
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

    const minion = await (async () => {
      if (scopedRepos?.minions?.findById) {
        return scopedRepos.minions.findById({ id: assignment.minion_id || assignment.minionId, userId: session.userId, tenantId: session.tenantId });
      }
      return ensureFunction(repository?.getMinion, "Minion lookup")(assignment.minionId);
    })();
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
