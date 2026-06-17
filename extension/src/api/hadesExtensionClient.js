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

const BASE_URL = "https://api.hades-os.app";

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
    throw new Error(`API error: ${response.status}`);
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
  return apiRequest(`/api/hades/extension/approvals/${approvalId}/approve`, {
    method: "POST",
  });
}
