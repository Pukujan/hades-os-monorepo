import { apiUrl, apiGet, apiPost } from "../../../../shared/api/client.js";

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

export async function listExtensionApiKeys() {
  return apiGet(`${BASE_PATH}/keys`);
}

export async function generateExtensionApiKey({ name, scopes }) {
  return apiPost(`${BASE_PATH}/keys`, { name, scopes });
}

export async function rotateExtensionApiKey(id) {
  return apiPost(`${BASE_PATH}/keys/${id}/rotate`);
}

export async function revokeExtensionApiKey(id) {
  return apiPost(`${BASE_PATH}/keys/${id}/revoke`);
}

export async function downloadExtensionBundle() {
  const response = await fetch(apiUrl(`${BASE_PATH}/download`));
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.blob();
}

export function buildExtensionDownloadUrl() {
  return apiUrl(`${BASE_PATH}/download`);
}
