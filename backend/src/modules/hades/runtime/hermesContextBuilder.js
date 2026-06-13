export function buildHermesContext({
  authContext,
  trigger,
  minion,
  assignment,
  scopedMemory = [],
  allowedTools = [],
  socialConnection,
}) {
  if (minion && (minion.user_id !== authContext.userId)) {
    throw Object.assign(new Error("Minion scope mismatch"), { code: "minion_scope_mismatch" });
  }

  if (assignment && (assignment.tenant_id !== authContext.tenantId)) {
    throw Object.assign(new Error("Assignment scope mismatch"), { code: "assignment_scope_mismatch" });
  }

  for (const mem of scopedMemory) {
    if (mem.user_id !== authContext.userId || mem.tenant_id !== authContext.tenantId) {
      throw Object.assign(new Error("Memory scope mismatch"), { code: "memory_scope_mismatch" });
    }
  }

  let sanitizedConnection = null;
  if (socialConnection) {
    const { encrypted_bot_token, bot_token, ...rest } = socialConnection;
    sanitizedConnection = rest;
  }

  return {
    userId: authContext.userId,
    tenantId: authContext.tenantId,
    sessionId: authContext.sessionId || null,
    trigger: {
      provider: trigger?.provider || null,
      content: trigger?.content || null,
      channelId: trigger?.channelId || null,
      triggerType: trigger?.triggerType || null,
    },
    minion: minion || null,
    assignment: assignment || null,
    scopedMemory: scopedMemory.map((m) => ({
      id: m.id,
      content: m.content,
      created_at: m.created_at,
    })),
    allowedTools: allowedTools || [],
    socialConnection: sanitizedConnection,
    untrustedInput: {
      provider: trigger?.provider || null,
      content: trigger?.content || null,
      channelId: trigger?.channelId || null,
      triggerType: trigger?.triggerType || null,
    },
  };
}
