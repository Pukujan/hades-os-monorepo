export function buildExtensionConsoleState(raw) {
  if (!raw) {
    return {
      activeSurface: "browser-extension",
      workflows: [],
      documents: [],
      textContextSpaces: [],
      pageContext: null,
      pendingApprovals: [],
    };
  }

  return {
    activeSurface: "browser-extension",
    workflows: (raw.workflows || []).map((wf) => ({
      id: wf.id,
      name: wf.name,
      description: wf.explanation?.shortDescription || "",
    })),
    documents: (raw.documents || []).map((doc) => ({
      id: doc.id,
      filename: doc.filename,
      kind: doc.kind,
    })),
    textContextSpaces: (raw.textContextSpaces || []).map((space) => ({
      id: space.id,
      title: space.title,
    })),
    pageContext: raw.pageContext
      ? {
          url: raw.pageContext.url,
          title: raw.pageContext.title,
          selectedText: raw.pageContext.selectedText,
          formFields: raw.pageContext.formFields || [],
        }
      : null,
    pendingApprovals: (raw.approvals || []).filter((a) => a.status === "pending"),
  };
}
