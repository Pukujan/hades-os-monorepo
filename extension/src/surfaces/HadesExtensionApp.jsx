import React, { useState, useEffect } from "react";
import { getApiKey, setApiKey } from "../api/hadesExtensionClient.js";
import { HadesChatPanel } from "./HadesChatPanel.jsx";
import { WorkflowListPanel } from "./WorkflowListPanel.jsx";
import { ContextUploadPanel } from "./ContextUploadPanel.jsx";
import { TextContextSpacesPanel } from "./TextContextSpacesPanel.jsx";
import { PageCapturePanel } from "./PageCapturePanel.jsx";
import { ApprovalQueuePanel } from "./ApprovalQueuePanel.jsx";

function ExtensionConnectPanel({ onConnect }) {
  const [apiKey, setApiKeyState] = useState("");

  return React.createElement("div", { className: "connect-panel" },
    React.createElement("h2", null, "Extension API key"),
    React.createElement("p", null, "Paste your extension API key to connect Hades to this browser."),
    React.createElement("input", {
      type: "text",
      placeholder: "Paste extension API key",
      value: apiKey,
      onChange: function (e) { setApiKeyState(e.target.value); },
    }),
    React.createElement("button", {
      className: "primary",
      onClick: function () { if (typeof onConnect === "function") onConnect(apiKey); },
    }, "Connect"));
}

export function HadesExtensionApp() {
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");

  useEffect(function () {
    getApiKey().then(function (stored) {
      if (stored) setConnected(true);
    });
  }, []);

  async function handleConnect(apiKey) {
    await setApiKey(apiKey);
    setConnected(true);
  }

  if (!connected) {
    return React.createElement("div", { className: "hades-extension" },
      React.createElement(ExtensionConnectPanel, { onConnect: handleConnect }));
  }

  const tabs = [
    { id: "chat", label: "Chat" },
    { id: "workflows", label: "Workflows" },
    { id: "upload", label: "Upload" },
    { id: "spaces", label: "Spaces" },
    { id: "capture", label: "Capture" },
    { id: "approvals", label: "Approvals" },
  ];

  return React.createElement("div", { className: "hades-extension" },
    React.createElement("nav", { className: "tab-bar" },
      tabs.map(function (tab) {
        return React.createElement("button", {
          key: tab.id,
          className: activeTab === tab.id ? "tab active" : "tab",
          onClick: function () { setActiveTab(tab.id); },
        }, tab.label);
      })),
    React.createElement("div", { className: "panel-container" },
      activeTab === "chat" ? React.createElement(HadesChatPanel) : null,
      activeTab === "workflows" ? React.createElement(WorkflowListPanel) : null,
      activeTab === "upload" ? React.createElement(ContextUploadPanel) : null,
      activeTab === "spaces" ? React.createElement(TextContextSpacesPanel) : null,
      activeTab === "capture" ? React.createElement(PageCapturePanel) : null,
      activeTab === "approvals" ? React.createElement(ApprovalQueuePanel) : null,
    ),
    React.createElement("div", { className: "safety-notice" },
      React.createElement("p", null, "Safety boundary: Hades can draft, fill, and propose actions, but submit, send, and destructive actions require your approval.")));
}

export default HadesExtensionApp;
