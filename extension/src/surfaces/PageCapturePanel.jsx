import React, { useState } from "react";
import { capturePage } from "../api/hadesExtensionClient.js";

export function PageCapturePanel() {
  const [capturing, setCapturing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function handleCapture() {
    setCapturing(true);
    setError("");
    setResult(null);

    let pageData = { url: "", title: "", selectedText: "", fullText: "" };

    try {
      if (typeof chrome !== "undefined" && chrome.tabs?.query) {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs[0];
        pageData.url = tab.url || "";
        pageData.title = tab.title || "";

        const results = await chrome.scripting?.executeScript({
          target: { tabId: tab.id },
          func: function () {
            return {
              selectedText: window.getSelection()?.toString() || "",
              fullText: document.body?.innerText?.slice(0, 10000) || "",
            };
          },
        });
        if (results && results[0]?.result) {
          pageData.selectedText = results[0].result.selectedText;
          pageData.fullText = results[0].result.fullText;
        }
      } else {
        pageData.url = window.location?.href || "dev-mode";
        pageData.title = document?.title || "Dev Mode";
        pageData.selectedText = window.getSelection?.()?.toString() || "";
        pageData.fullText = document.body?.innerText?.slice(0, 10000) || "(page context not available)";
      }

      const apiResult = await capturePage(pageData);
      setResult(apiResult.pageCapture);
    } catch (err) {
      setError(err.message);
    } finally {
      setCapturing(false);
    }
  }

  return React.createElement("div", { className: "capture-panel", style: { padding: "8px" } },
    React.createElement("p", { style: { color: "#94a3b8", fontSize: "12px", marginBottom: "8px" } },
      "Capture the current page for context. This reads the page title, URL, selected text, and page body text."),

    React.createElement("button", {
      className: "primary",
      onClick: handleCapture,
      disabled: capturing,
      style: { width: "100%" },
    }, capturing ? "Capturing..." : "Capture This Page"),

    error ? React.createElement("p", { style: { color: "#ef4444", fontSize: "12px", marginTop: "8px" } }, error) : null,

    result ? React.createElement("div", { style: { marginTop: "8px", padding: "8px", background: "#1e293b", borderRadius: "8px", fontSize: "12px" } },
      React.createElement("p", { style: { color: "#22c55e", margin: "0 0 4px" } }, "Page captured."),
      React.createElement("p", { style: { color: "#94a3b8", margin: "0" } }, "URL: " + (result.url || "N/A")),
      React.createElement("p", { style: { color: "#94a3b8", margin: "0" } }, "Title: " + (result.title || "N/A")),
      result.selected_text ? React.createElement("p", { style: { color: "#94a3b8", margin: "0" } }, "Selected: " + result.selected_text.slice(0, 100)) : null) : null);
}

export default PageCapturePanel;
