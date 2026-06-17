import React from "react";

export function HadesChatPanel() {
  return React.createElement("div", { className: "chat-panel" },
    React.createElement("textarea", { placeholder: "Type a message...", rows: 4, style: { width: "100%", background: "#16213e", color: "#e2e8f0", border: "1px solid #334155", borderRadius: "8px", padding: "8px" } }));
}

export default HadesChatPanel;
