function detectMermaidDirection(diagram) {
  if (!diagram || typeof diagram !== "string") return "TD";
  const firstLine = diagram.trim().split("\n")[0] || "";
  const match = firstLine.match(/\bflowchart\s+(TB|TD|BT|RL|LR)\b/i);
  return match ? match[1].toUpperCase() : "TD";
}

export function normalizeWorkflowExplanation(raw) {
  if (!raw) return { shortDescription: "", usesBackendExplanation: false };

  const mermaidDirection = detectMermaidDirection(raw.mermaidDiagram);
  const isLR = mermaidDirection === "LR" || mermaidDirection === "RL";
  const normalizedDirection = isLR ? "TD" : mermaidDirection;

  return {
    shortDescription: raw.shortDescription || "",
    explanationMarkdown: raw.explanationMarkdown || "",
    mermaidDiagram: raw.mermaidDiagram || "",
    mermaidDirection: normalizedDirection,
    guardrailSummary: raw.guardrailSummary || "",
    creationLog: raw.creationLog || "",
    usesBackendExplanation: Boolean(raw.shortDescription || raw.explanationMarkdown || raw.mermaidDiagram),
    fallbackApplied: isLR,
  };
}

export function mapWorkflowListItem(raw) {
  if (!raw) return null;

  return {
    id: raw.id || "",
    title: raw.name || "Untitled workflow",
    description: raw.explanation?.shortDescription || "",
    status: raw.status || "draft",
    runStatus: raw.lastRun?.status || null,
    nextAction: raw.lastRun?.nextAction || null,
  };
}
