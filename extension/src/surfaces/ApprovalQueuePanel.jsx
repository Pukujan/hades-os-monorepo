import React from "react";

export function ApprovalQueuePanel() {
  return React.createElement("div", { className: "approval-queue" },
    React.createElement("div", { className: "approval-card" },
      React.createElement("p", null, "No pending approvals.")));
}

export default ApprovalQueuePanel;
