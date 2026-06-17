const SENSITIVE_FIELD_TYPES = ["email", "password", "tel", "hidden"];

export function createBrowserExtensionContract() {
  function normalizePageCapture(raw) {
    if (!raw) return { url: "", title: "", text: "", forms: [] };

    return {
      url: raw.url || "",
      title: raw.title || "",
      text: raw.text || "",
      forms: (raw.forms || []).map((form) => ({
        selector: form.selector || "",
        submitSelector: form.submitSelector || null,
        fields: (form.fields || []).map((field) => {
          const isSensitive = SENSITIVE_FIELD_TYPES.includes(field.type);
          return {
            name: field.name,
            type: field.type,
            hasSensitiveValue: isSensitive,
            value: isSensitive ? undefined : field.value,
          };
        }),
      })),
    };
  }

  function proposeFormActions({ pageContext, artifactMap } = {}) {
    const actions = [];

    if (!pageContext) return { actions, requiresApprovalForSubmit: true };

    for (const form of pageContext.forms) {
      for (const field of form.fields) {
        if (field.hasSensitiveValue) continue;
        actions.push({ type: "fill_field", selector: `[name="${field.name}"]`, value: field.value });
      }
    }

    if (artifactMap) {
      for (const [key, artifactId] of Object.entries(artifactMap)) {
        if (key === "coverLetter" || key === "resume") {
          actions.push({ type: "attach_file", artifactId, field: key });
        }
      }
    }

    return {
      actions,
      requiresApprovalForSubmit: true,
    };
  }

  return { normalizePageCapture, proposeFormActions };
}
