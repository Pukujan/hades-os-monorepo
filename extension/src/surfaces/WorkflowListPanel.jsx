import React, { useState, useEffect } from "react";
import { listWorkflows, listMinions, saveMinion } from "../api/hadesExtensionClient.js";
import { WorkflowDetailPanel } from "./WorkflowDetailPanel.jsx";

export function WorkflowListPanel() {
  const [workflows, setWorkflows] = useState([]);
  const [minions, setMinions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newMinionName, setNewMinionName] = useState("");
  const [newMinionGoal, setNewMinionGoal] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null);

  useEffect(function () {
    Promise.all([
      listWorkflows().catch(function () { return { workflows: [] }; }),
      listMinions().catch(function () { return { minions: [] }; }),
    ]).then(function ([wfResult, minionResult]) {
      setWorkflows(wfResult.workflows || []);
      setMinions(minionResult.minions || []);
      setLoading(false);
    }).catch(function (err) {
      setError(err.message);
      setLoading(false);
    });
  }, []);

  async function handleSaveMinion() {
    if (!newMinionName.trim()) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const result = await saveMinion({ name: newMinionName.trim(), goal: newMinionGoal.trim() });
      setMinions(function (prev) { return [...prev, result.minion]; });
      setNewMinionName("");
      setNewMinionGoal("");
      setSaveMsg("Minion saved.");
    } catch (err) {
      setSaveMsg("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return React.createElement("div", { className: "workflow-list", style: { padding: "8px" } },
      React.createElement("p", null, "Loading..."));
  }

  if (selectedWorkflowId) {
    return React.createElement(WorkflowDetailPanel, {
      workflowId: selectedWorkflowId,
      onBack: function () { setSelectedWorkflowId(null); },
    });
  }

  return React.createElement("div", { className: "workflow-list", style: { padding: "8px" } },
    error ? React.createElement("p", { style: { color: "#ef4444", fontSize: "12px" } }, error) : null,

    React.createElement("h3", { style: { margin: "0 0 8px", fontSize: "14px", color: "#a8b5c0" } }, "Workflows"),
    workflows.length === 0
      ? React.createElement("p", { style: { color: "#64748b", fontSize: "12px" } }, "No workflows yet.")
      : React.createElement("ul", { style: { listStyle: "none", padding: 0, margin: 0 } },
          workflows.map(function (wf) {
            return React.createElement("li", { key: wf.id, style: { padding: "6px 8px", margin: "4px 0", background: "#1e293b", borderRadius: "6px", fontSize: "13px", cursor: "pointer" },
              onClick: function () { setSelectedWorkflowId(wf.id); } },
              React.createElement("strong", null, wf.name),
              wf.goal ? React.createElement("span", { style: { color: "#94a3b8", marginLeft: "6px" } }, "\u2014 " + wf.goal) : null);
          })),

    React.createElement("h3", { style: { margin: "16px 0 8px", fontSize: "14px", color: "#a8b5c0" } }, "Minions"),
    minions.length === 0
      ? React.createElement("p", { style: { color: "#64748b", fontSize: "12px" } }, "No minions yet.")
      : React.createElement("ul", { style: { listStyle: "none", padding: 0, margin: 0 } },
          minions.map(function (m) {
            return React.createElement("li", { key: m.id, style: { padding: "6px 8px", margin: "4px 0", background: "#1e293b", borderRadius: "6px", fontSize: "13px" } },
              React.createElement("strong", null, m.name),
              m.goal ? React.createElement("span", { style: { color: "#94a3b8", marginLeft: "6px" } }, "\u2014 " + m.goal) : null);
          })),

    React.createElement("h3", { style: { margin: "16px 0 8px", fontSize: "14px", color: "#a8b5c0" } }, "New Minion"),
    React.createElement("input", {
      placeholder: "Minion name",
      value: newMinionName,
      onChange: function (e) { setNewMinionName(e.target.value); },
      style: { width: "100%", padding: "6px", marginBottom: "4px", background: "#16213e", color: "#e2e8f0", border: "1px solid #334155", borderRadius: "6px", boxSizing: "border-box" },
    }),
    React.createElement("input", {
      placeholder: "Goal (optional)",
      value: newMinionGoal,
      onChange: function (e) { setNewMinionGoal(e.target.value); },
      style: { width: "100%", padding: "6px", marginBottom: "4px", background: "#16213e", color: "#e2e8f0", border: "1px solid #334155", borderRadius: "6px", boxSizing: "border-box" },
    }),
    React.createElement("button", {
      className: "primary",
      onClick: handleSaveMinion,
      disabled: saving || !newMinionName.trim(),
      style: { width: "100%" },
    }, saving ? "Saving..." : "Save Minion"),
    saveMsg ? React.createElement("p", { style: { color: saveMsg.startsWith("Error") ? "#ef4444" : "#22c55e", fontSize: "12px", marginTop: "4px" } }, saveMsg) : null);
}

export default WorkflowListPanel;
