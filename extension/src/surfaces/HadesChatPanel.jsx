import React, { useState } from "react";
import { sendChatMessage } from "../api/hadesExtensionClient.js";

export function HadesChatPanel() {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSend() {
    if (!message.trim()) return;
    setLoading(true);
    setError("");
    setReply("");
    try {
      const result = await sendChatMessage(message);
      setReply(result.reply || "(no response)");
      setMessage("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return React.createElement("div", { className: "chat-panel", style: { padding: "8px" } },
    React.createElement("textarea", {
      placeholder: "Type a message...",
      rows: 4,
      value: message,
      onChange: function (e) { setMessage(e.target.value); },
      style: { width: "100%", background: "#16213e", color: "#e2e8f0", border: "1px solid #334155", borderRadius: "8px", padding: "8px", boxSizing: "border-box" },
    }),
    React.createElement("button", {
      className: "primary",
      onClick: handleSend,
      disabled: loading || !message.trim(),
      style: { marginTop: "8px", width: "100%" },
    }, loading ? "Sending..." : "Send"),
    error ? React.createElement("p", { style: { color: "#ef4444", marginTop: "8px", fontSize: "12px" } }, error) : null,
    reply ? React.createElement("div", { style: { marginTop: "8px", padding: "8px", background: "#1e293b", borderRadius: "8px", color: "#e2e8f0", fontSize: "13px", whiteSpace: "pre-wrap" } }, reply) : null);
}

export default HadesChatPanel;
