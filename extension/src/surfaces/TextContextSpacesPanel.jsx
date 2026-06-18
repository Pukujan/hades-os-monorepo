import React, { useState, useEffect } from "react";
import { listContextSpaces, saveTextContext } from "../api/hadesExtensionClient.js";

export function TextContextSpacesPanel() {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(function () {
    listContextSpaces().then(function (result) {
      setSpaces(result.contextSpaces || []);
      setLoading(false);
    }).catch(function () {
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    if (!name.trim() || !content.trim()) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const result = await saveTextContext(name.trim(), content);
      setSpaces(function (prev) {
        const filtered = prev.filter(function (s) { return s.name !== name.trim(); });
        return [result.contextSpace, ...filtered];
      });
      setName("");
      setContent("");
      setSaveMsg("Saved.");
    } catch (err) {
      setSaveMsg("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return React.createElement("div", { className: "text-spaces", style: { padding: "8px" } },
    error ? React.createElement("p", { style: { color: "#ef4444", fontSize: "12px" } }, error) : null,

    React.createElement("h3", { style: { margin: "0 0 8px", fontSize: "14px", color: "#a8b5c0" } }, "New Space"),
    React.createElement("input", {
      placeholder: "Space name",
      value: name,
      onChange: function (e) { setName(e.target.value); },
      style: { width: "100%", padding: "6px", marginBottom: "4px", background: "#16213e", color: "#e2e8f0", border: "1px solid #334155", borderRadius: "6px", boxSizing: "border-box" },
    }),
    React.createElement("textarea", {
      placeholder: "Content...",
      rows: 4,
      value: content,
      onChange: function (e) { setContent(e.target.value); },
      style: { width: "100%", background: "#16213e", color: "#e2e8f0", border: "1px solid #334155", borderRadius: "8px", padding: "8px", boxSizing: "border-box" },
    }),
    React.createElement("button", {
      className: "primary",
      onClick: handleSave,
      disabled: saving || !name.trim() || !content.trim(),
      style: { width: "100%", marginTop: "8px" },
    }, saving ? "Saving..." : "Save Space"),
    saveMsg ? React.createElement("p", { style: { color: saveMsg.startsWith("Error") ? "#ef4444" : "#22c55e", fontSize: "12px", marginTop: "4px" } }, saveMsg) : null,

    React.createElement("h3", { style: { margin: "16px 0 8px", fontSize: "14px", color: "#a8b5c0" } }, "Saved Spaces"),
    loading
      ? React.createElement("p", { style: { color: "#64748b", fontSize: "12px" } }, "Loading...")
      : spaces.length === 0
        ? React.createElement("p", { style: { color: "#64748b", fontSize: "12px" } }, "No spaces yet.")
        : React.createElement("ul", { style: { listStyle: "none", padding: 0, margin: 0 } },
            spaces.map(function (s) {
              return React.createElement("li", { key: s.id, style: { padding: "6px 8px", margin: "4px 0", background: "#1e293b", borderRadius: "6px", fontSize: "12px" } },
                React.createElement("strong", null, s.name),
                React.createElement("p", { style: { color: "#94a3b8", margin: "2px 0 0", fontSize: "11px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, s.content));
            })));
}

export default TextContextSpacesPanel;
