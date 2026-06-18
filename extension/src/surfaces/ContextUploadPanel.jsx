import React, { useState, useEffect } from "react";
import { listDocuments, saveDocumentFromText } from "../api/hadesExtensionClient.js";

export function ContextUploadPanel() {
  const [text, setText] = useState("");
  const [docName, setDocName] = useState("");
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");

  useEffect(function () {
    listDocuments().then(function (result) {
      setDocuments(result.documents || []);
      setLoading(false);
    }).catch(function () {
      setLoading(false);
    });
  }, []);

  async function handleUpload() {
    if (!text.trim()) return;
    setUploading(true);
    setUploadMsg("");
    try {
      const name = docName.trim() || "Pasted text " + new Date().toLocaleString();
      const result = await saveDocumentFromText({ name, textContent: text });
      setDocuments(function (prev) { return [result.document, ...prev]; });
      setText("");
      setDocName("");
      setUploadMsg("Saved.");
    } catch (err) {
      setUploadMsg("Error: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  return React.createElement("div", { className: "upload-panel", style: { padding: "8px" } },
    error ? React.createElement("p", { style: { color: "#ef4444", fontSize: "12px" } }, error) : null,

    React.createElement("h3", { style: { margin: "0 0 8px", fontSize: "14px", color: "#a8b5c0" } }, "Paste Context"),
    React.createElement("input", {
      placeholder: "Document name (optional)",
      value: docName,
      onChange: function (e) { setDocName(e.target.value); },
      style: { width: "100%", padding: "6px", marginBottom: "4px", background: "#16213e", color: "#e2e8f0", border: "1px solid #334155", borderRadius: "6px", boxSizing: "border-box" },
    }),
    React.createElement("textarea", {
      placeholder: "Paste text content here...",
      rows: 6,
      value: text,
      onChange: function (e) { setText(e.target.value); },
      style: { width: "100%", background: "#16213e", color: "#e2e8f0", border: "1px solid #334155", borderRadius: "8px", padding: "8px", boxSizing: "border-box" },
    }),
    React.createElement("button", {
      className: "primary",
      onClick: handleUpload,
      disabled: uploading || !text.trim(),
      style: { width: "100%", marginTop: "8px" },
    }, uploading ? "Saving..." : "Save as Context"),
    uploadMsg ? React.createElement("p", { style: { color: uploadMsg.startsWith("Error") ? "#ef4444" : "#22c55e", fontSize: "12px", marginTop: "4px" } }, uploadMsg) : null,

    React.createElement("h3", { style: { margin: "16px 0 8px", fontSize: "14px", color: "#a8b5c0" } }, "Saved Documents"),
    loading
      ? React.createElement("p", { style: { color: "#64748b", fontSize: "12px" } }, "Loading...")
      : documents.length === 0
        ? React.createElement("p", { style: { color: "#64748b", fontSize: "12px" } }, "No documents yet.")
        : React.createElement("ul", { style: { listStyle: "none", padding: 0, margin: 0 } },
            documents.map(function (doc) {
              return React.createElement("li", { key: doc.id, style: { padding: "6px 8px", margin: "4px 0", background: "#1e293b", borderRadius: "6px", fontSize: "12px" } },
                React.createElement("strong", null, doc.name || "Untitled"),
                React.createElement("span", { style: { color: "#94a3b8", marginLeft: "6px" } }, doc.content_type || ""),
                doc.size ? React.createElement("span", { style: { color: "#64748b", marginLeft: "6px" } }, doc.size + " bytes") : null);
            })));
}

export default ContextUploadPanel;
