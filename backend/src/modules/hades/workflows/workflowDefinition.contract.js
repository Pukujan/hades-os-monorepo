import { AppError } from "../../../shared/http/errors.js";

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(`${label} is required`, 400);
  }
}

function assertOptionalArray(value, label) {
  if (value != null && !Array.isArray(value)) {
    throw new AppError(`${label} must be an array`, 400);
  }
}

function detectMermaidDirection(diagram) {
  if (!diagram || typeof diagram !== "string") return "TD";
  const firstLine = diagram.trim().split("\n")[0] || "";
  const match = firstLine.match(/\bflowchart\s+(TB|TD|BT|RL|LR)\b/i);
  return match ? match[1].toUpperCase() : "TD";
}

export function validateWorkflowDefinition(input) {
  assertNonEmptyString(input?.name, "name");
  assertNonEmptyString(input?.goal, "goal");
  assertOptionalArray(input?.guardrails, "guardrails");
  assertOptionalArray(input?.allowedTools, "allowedTools");
  assertOptionalArray(input?.requiredContext, "requiredContext");

  const explanation = input.explanation || {};
  const mermaidDirection = detectMermaidDirection(explanation.mermaidDiagram);

  return {
    ok: true,
    value: {
      kind: "workflow",
      name: input.name.trim(),
      goal: input.goal.trim(),
      prompt: input.prompt ? input.prompt.trim() : "",
      guardrails: input.guardrails || [],
      allowedTools: input.allowedTools || [],
      approvalPolicy: input.approvalPolicy || { requireApprovalFor: [] },
      requiredContext: input.requiredContext || [],
      explanation: {
        shortDescription: explanation.shortDescription || "",
        markdownTable: explanation.markdownTable || "",
        mermaidDiagram: explanation.mermaidDiagram || "",
        mermaidDirection,
        guardrailSummary: explanation.guardrailSummary || "",
        creationLog: explanation.creationLog || "",
      },
    },
  };
}
