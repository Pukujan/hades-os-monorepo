import React, { useState, useEffect, useCallback } from "react";
import { downloadExtensionBundle, generateExtensionApiKey, listExtensionApiKeys, rotateExtensionApiKey, revokeExtensionApiKey } from "../services/extensionInstallApi.js";

export function ExtensionInstallCard({ providerId, accessToken } = {}) {
  const [keys, setKeys] = useState([]);
  const [latestCreatedSecret, setLatestCreatedSecret] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  function refreshKeys() {
    listExtensionApiKeys().then(function (data) {
      setKeys(data.keys || []);
    }).catch(function () {});
  }

  useEffect(function () {
    refreshKeys();
  }, []);

  function handleGenerateKey() {
    setIsGenerating(true);
    const name = "Chrome extension";
    const scopes = ["workflow:read", "document:upload", "approval:create"];
    generateExtensionApiKey({ name, scopes }).then(function (data) {
      if (data.secret) {
        setLatestCreatedSecret(data.secret);
      }
      setKeys(function (prev) { return [data.record].concat(prev); });
    }).catch(function () {
    }).finally(function () {
      setIsGenerating(false);
    });
  }

  function handleCopySecret() {
    if (latestCreatedSecret) {
      navigator.clipboard.writeText(latestCreatedSecret);
    }
  }

  function handleRotateKey(id) {
    rotateExtensionApiKey(id).then(function (data) {
      if (data.secret) {
        setLatestCreatedSecret(data.secret);
      }
      refreshKeys();
    }).catch(function () {});
  }

  function handleRevokeKey(id) {
    revokeExtensionApiKey(id).then(function () {
      refreshKeys();
    }).catch(function () {});
  }

  function handleDownload() {
    downloadExtensionBundle(accessToken).then(function (blob) {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "hades-extension.zip";
      anchor.click();
      window.setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 1000);
    }).catch(function () {});
  }

  return React.createElement("div", { className: "card extension-install-card", "data-provider": providerId },
    React.createElement("div", { className: "card-header" },
      React.createElement("h3", null, "Hades Browser Extension")),
    React.createElement("div", { className: "card-body" },
      React.createElement("p", null, "Install the Hades browser extension to use workflows directly from any page."),
      latestCreatedSecret
        ? React.createElement("div", { className: "secret-display" },
            React.createElement("code", null, latestCreatedSecret),
            React.createElement("button", { className: "secondary", onClick: handleCopySecret }, "Copy API key"))
        : null,
      React.createElement("div", { className: "key-list" },
        keys.map(function (k) {
          return React.createElement("div", { key: k.id, className: "key-row", "data-revoked": !!k.revokedAt },
            React.createElement("span", { className: "key-preview" }, k.secretPreview || k.name),
            !k.revokedAt
              ? React.createElement("span", { className: "key-actions" },
                  React.createElement("button", { className: "small", onClick: function () { handleRotateKey(k.id); } }, "Rotate"),
                  React.createElement("button", { className: "small danger", onClick: function () { handleRevokeKey(k.id); } }, "Revoke"))
              : React.createElement("span", { className: "revoked-label" }, "Revoked"));
        })),
      React.createElement("div", { className: "card-actions" },
        React.createElement("button", { className: "primary", onClick: handleGenerateKey, disabled: isGenerating },
          isGenerating ? "Generating..." : "Generate new API key"),
        React.createElement("button", { className: "secondary", onClick: handleDownload }, "Download extension"))));
}

export default ExtensionInstallCard;
