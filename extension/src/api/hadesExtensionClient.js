const STORAGE_KEY = "hades_api_key";

export async function getApiKey() {
  return new Promise((resolve) => {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        resolve(result[STORAGE_KEY] || null);
      });
    } else {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        resolve(stored);
      } catch {
        resolve(null);
      }
    }
  });
}

export async function setApiKey(key) {
  return new Promise((resolve) => {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.set({ [STORAGE_KEY]: key }, resolve);
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, key);
      } catch {}
      resolve();
    }
  });
}

const BASE_URL = (typeof __VITE_API_BASE_URL__ !== "undefined" ? __VITE_API_BASE_URL__ : (typeof process !== "undefined" && process.env?.VITE_API_BASE_URL ? process.env.VITE_API_BASE_URL : "https://hades-os-monorepo-production.up.railway.app"));

export async function apiRequest(path, options = {}) {
  const apiKey = await getApiKey();
  const headers = {
    "Content-Type": "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`API error: ${response.status}${errorBody ? ` - ${errorBody}` : ""}`);
  }

  return response.json();
}

export function listWorkflows() {
  return apiRequest("/api/hades/extension/workflows");
}

export function listDocuments() {
  return apiRequest("/api/hades/extension/documents");
}

export function uploadDocument(file) {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest("/api/hades/extension/documents", {
    method: "POST",
    headers: {},
    body: formData,
  });
}

export function listApprovals() {
  return apiRequest("/api/hades/extension/approvals");
}

export function approveAction(approvalId) {
  return apiRequest(`/api/hades/extension/approvals/${approvalId}/decision`, {
    method: "POST",
    body: JSON.stringify({ status: "approved" }),
  });
}

export function rejectAction(approvalId) {
  return apiRequest(`/api/hades/extension/approvals/${approvalId}/decision`, {
    method: "POST",
    body: JSON.stringify({ status: "rejected" }),
  });
}

export function sendChatMessage(message) {
  return apiRequest("/api/hades/extension/chat", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export function listMinions() {
  return apiRequest("/api/hades/extension/minions");
}

export function saveMinion(minionData) {
  return apiRequest("/api/hades/extension/minions", {
    method: "POST",
    body: JSON.stringify(minionData),
  });
}

export function saveTextContext(name, content) {
  return apiRequest("/api/hades/extension/context-spaces", {
    method: "POST",
    body: JSON.stringify({ name, content }),
  });
}

export function listContextSpaces() {
  return apiRequest("/api/hades/extension/context-spaces");
}

export function capturePage(pageData) {
  return apiRequest("/api/hades/extension/page-capture", {
    method: "POST",
    body: JSON.stringify(pageData),
  });
}

export function saveDocumentFromText({ name, textContent }) {
  return apiRequest("/api/hades/extension/documents", {
    method: "POST",
    body: JSON.stringify({ name, textContent, contentType: "text/plain", size: textContent.length }),
  });
}
