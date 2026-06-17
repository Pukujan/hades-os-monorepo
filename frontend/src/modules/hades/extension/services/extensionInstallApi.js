const BASE_PATH = "/api/hades/extension";

export const EXTENSION_API_CONTRACT = {
  endpoints: {
    listKeys: "GET /api/hades/extension/keys",
    createKey: "POST /api/hades/extension/keys",
    rotateKey: "POST /api/hades/extension/keys/:id/rotate",
    revokeKey: "POST /api/hades/extension/keys/:id/revoke",
    downloadBundle: "GET /api/hades/extension/download",
  },
};

async function apiFetch(path, options = {}) {
  const response = await fetch(`${BASE_PATH}${path}`, {
    headers: { "content-type": "application/json", ...options.headers },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response;
}

export async function listExtensionApiKeys() {
  const res = await apiFetch("/keys");
  return res.json();
}

export async function generateExtensionApiKey({ name, scopes }) {
  const res = await apiFetch("/keys", {
    method: "POST",
    body: JSON.stringify({ name, scopes }),
  });
  return res.json();
}

export async function rotateExtensionApiKey(id) {
  const res = await apiFetch(`/keys/${id}/rotate`, { method: "POST" });
  return res.json();
}

export async function revokeExtensionApiKey(id) {
  const res = await apiFetch(`/keys/${id}/revoke`, { method: "POST" });
  return res.json();
}

export async function downloadExtensionBundle() {
  const res = await apiFetch("/download");
  return res.blob();
}

export function buildExtensionDownloadUrl() {
  return `${BASE_PATH}/download`;
}
