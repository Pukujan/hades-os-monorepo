import React, { useState, useEffect } from "react";
import { listApprovals, approveAction, rejectAction } from "../api/hadesExtensionClient.js";

export function ApprovalQueuePanel() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(null);

  function loadApprovals() {
    setLoading(true);
    listApprovals().then(function (result) {
      setApprovals(result.approvals || []);
      setLoading(false);
    }).catch(function (err) {
      setError(err.message);
      setLoading(false);
    });
  }

  useEffect(function () { loadApprovals(); }, []);

  async function handleDecision(id, status) {
    setActing(id);
    try {
      if (status === "approved") {
        await approveAction(id);
      } else {
        await rejectAction(id);
      }
      setApprovals(function (prev) { return prev.filter(function (a) { return a.id !== id; }); });
    } catch (err) {
      setError(err.message);
    } finally {
      setActing(null);
    }
  }

  return React.createElement("div", { className: "approval-queue", style: { padding: "8px" } },
    error ? React.createElement("p", { style: { color: "#ef4444", fontSize: "12px", marginBottom: "8px" } }, error) : null,

    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" } },
      React.createElement("h3", { style: { margin: 0, fontSize: "14px", color: "#a8b5c0" } }, "Pending Approvals"),
      React.createElement("button", {
        onClick: loadApprovals,
        style: { background: "none", border: "1px solid #334155", color: "#94a3b8", borderRadius: "4px", padding: "2px 8px", cursor: "pointer", fontSize: "11px" },
      }, "Refresh")),

    loading
      ? React.createElement("p", { style: { color: "#64748b", fontSize: "12px" } }, "Loading...")
      : approvals.length === 0
        ? React.createElement("div", { className: "approval-card" },
            React.createElement("p", null, "No pending approvals."))
        : React.createElement("div", null,
            approvals.map(function (a) {
              return React.createElement("div", { key: a.id, className: "approval-card", style: { marginBottom: "8px" } },
                React.createElement("p", { style: { fontWeight: "bold", margin: "0 0 4px" } }, a.action_type || "Action"),
                React.createElement("p", { style: { fontSize: "12px", color: "#94a3b8", margin: "0 0 8px" } }, a.description || ""),
                React.createElement("div", { style: { display: "flex", gap: "8px" } },
                  React.createElement("button", {
                    className: "approve",
                    onClick: function () { handleDecision(a.id, "approved"); },
                    disabled: acting === a.id,
                    style: { flex: 1, padding: "6px", background: "#166534", color: "#e2e8f0", border: "none", borderRadius: "6px", cursor: "pointer" },
                  }, acting === a.id ? "..." : "Approve"),
                  React.createElement("button", {
                    className: "reject",
                    onClick: function () { handleDecision(a.id, "rejected"); },
                    disabled: acting === a.id,
                    style: { flex: 1, padding: "6px", background: "#7f1d1d", color: "#e2e8f0", border: "none", borderRadius: "6px", cursor: "pointer" },
                  }, acting === a.id ? "..." : "Reject")));
            })));
}

export default ApprovalQueuePanel;
