export function buildWorkflowCrudPayload(raw) {
  if (!raw) return null;

  return {
    kind: "workflow",
    name: raw.name || "",
    goal: raw.goal || "",
    prompt: raw.prompt || "",
    guardrails: raw.guardrails || [],
    allowedTools: raw.allowedTools || [],
    requiredContextIds: raw.selectedContextIds || [],
    promptGuardrailEditable: true,
    previewSource: "backend",
  };
}

export function buildExtensionKeySettingsView(raw) {
  if (!raw || !Array.isArray(raw.keys)) {
    return { rows: [] };
  }

  return {
    rows: raw.keys.map((key) => ({
      id: key.id,
      name: key.name,
      scopes: key.scopes || [],
      canRotate: !key.revokedAt,
      canRevoke: !key.revokedAt,
      secretVisible: false,
      revokedAt: key.revokedAt || null,
    })),
  };
}
