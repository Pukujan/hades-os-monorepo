import React, { useState, useEffect } from "react";
import { listWorkflows } from "../api/hadesExtensionClient.js";

export function WorkflowDetailPanel({ workflowId, onBack }) {
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(function () {
    if (!workflowId) { setLoading(false); return; }
    listWorkflows().then(function (result) {
      const wf = (result.workflows || []).find(function (w) { return w.id === workflowId; });
      if (wf) setWorkflow(wf);
      else setError("Workflow not found");
      setLoading(false);
    }).catch(function (err) {
      setError(err.message);
      setLoading(false);
    });
  }, [workflowId]);

  if (loading) {
    return React.createElement("div", { className: "workflow-detail", style: { padding: "8px" } },
      React.createElement("p", null, "Loading..."));
  }

  if (error) {
    return React.createElement("div", { className: "workflow-detail", style: { padding: "8px" } },
      React.createElement("button", { onClick: onBack, style: { background: "none", border: "none", color: "#60a5fa", cursor: "pointer", fontSize: "13px", padding: 0 } }, "\u2190 Back"),
      React.createElement("p", { style: { color: "#ef4444", fontSize: "12px" } }, error));
  }

  if (!workflow) {
    return React.createElement("div", { className: "workflow-detail", style: { padding: "8px" } },
      React.createElement("button", { onClick: onBack, style: { background: "none", border: "none", color: "#60a5fa", cursor: "pointer", fontSize: "13px", padding: 0 } }, "\u2190 Back"),
      React.createElement("p", { style: { color: "#64748b", fontSize: "12px" } }, "Select a workflow to view details."));
  }

  const exp = workflow.explanation || {};
  const diagram = exp.mermaidDiagram || "";
  const direction = exp.mermaidDirection || "TD";

  return React.createElement("div", { className: "workflow-detail", style: { padding: "8px" } },
    React.createElement("button", { onClick: onBack, style: { background: "none", border: "none", color: "#60a5fa", cursor: "pointer", fontSize: "13px", padding: "0 0 8px" } }, "\u2190 Back to list"),

    React.createElement("h2", { style: { margin: "0 0 4px", fontSize: "16px", color: "#e2e8f0" } }, workflow.name),
    React.createElement("p", { style: { color: "#94a3b8", fontSize: "13px", margin: "0 0 12px" } }, exp.shortDescription || workflow.goal || ""),

    React.createElement("h3", { style: { margin: "0 0 4px", fontSize: "13px", color: "#a8b5c0" } }, "Goal"),
    React.createElement("p", { style: { color: "#e2e8f0", fontSize: "12px", margin: "0 0 12px", background: "#1e293b", padding: "8px", borderRadius: "6px" } }, workflow.goal || "No goal set."),

    React.createElement("h3", { style: { margin: "0 0 4px", fontSize: "13px", color: "#a8b5c0" } }, "Allowed Tools"),
    React.createElement("ul", { style: { listStyle: "none", padding: 0, margin: "0 0 12px" } },
      (workflow.allowedTools || []).map(function (tool) {
        return React.createElement("li", { key: tool, style: { color: "#94a3b8", fontSize: "12px", padding: "2px 0" } }, "- " + tool);
      })),
    diagram ? React.createElement("div", { style: { margin: "0 0 12px" } },
      React.createElement("h3", { style: { margin: "0 0 4px", fontSize: "13px", color: "#a8b5c0" } }, "Flow Diagram"),
      React.createElement("pre", { style: { background: "#0f172a", color: "#e2e8f0", padding: "8px", borderRadius: "6px", fontSize: "11px", overflowX: "auto", whiteSpace: "pre", margin: 0 } },
        "flowchart " + direction + "\n" + diagram.split("\n").slice(1).join("\n"))) : null,

    workflow.guardrails?.length > 0 ? React.createElement("div", null,
      React.createElement("h3", { style: { margin: "0 0 4px", fontSize: "13px", color: "#a8b5c0" } }, "Safety Guardrails"),
      React.createElement("ul", { style: { listStyle: "none", padding: 0, margin: 0 } },
        workflow.guardrails.map(function (g, i) {
          return React.createElement("li", { key: i, style: { color: "#94a3b8", fontSize: "12px", padding: "2px 0" } }, "- " + g);
        }))) : null);
}

export default WorkflowDetailPanel;
