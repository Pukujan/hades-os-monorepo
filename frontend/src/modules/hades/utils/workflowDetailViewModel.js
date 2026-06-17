function detectMermaidDirection(diagram) {
  if (!diagram || typeof diagram !== "string") return "TD";
  const firstLine = diagram.trim().split("\n")[0] || "";
  const match = firstLine.match(/\bflowchart\s+(TB|TD|BT|RL|LR)\b/i);
  return match ? match[1].toUpperCase() : "TD";
}

export function buildWorkflowDetailViewModel({ workflow, latestRun } = {}) {
  if (!workflow) return null;

  const explanation = workflow.explanation || {};
  const rawDirection = detectMermaidDirection(explanation.mermaidDiagram);
  const isWide = rawDirection === "LR" || rawDirection === "RL";
  const direction = isWide ? "TD" : rawDirection;

  const markdownBlocks = [];
  if (explanation.markdownTable) {
    markdownBlocks.push({ kind: "table", content: explanation.markdownTable });
  }
  if (explanation.guardrailSummary) {
    markdownBlocks.push({ kind: "text", content: explanation.guardrailSummary });
  }
  if (explanation.shortDescription) {
    markdownBlocks.unshift({ kind: "text", content: explanation.shortDescription });
  }

  const runStatus = latestRun?.status;
  const hasPendingApproval = latestRun?.auditEntries?.some(
    (entry) => entry.status === "paused_for_approval"
  );

  return {
    title: workflow.name || "Untitled workflow",
    description: explanation.shortDescription || "",
    markdownBlocks,
    mermaid: {
      diagram: explanation.mermaidDiagram || "",
      direction,
      fallbackApplied: isWide,
    },
    approvalBanner: {
      visible: runStatus === "approval_required" || hasPendingApproval,
      status: runStatus,
      entries: latestRun?.auditEntries || [],
    },
    runStatus,
  };
}
