let VITE_API_BASE_URL = "";
let MODE = "development";

try {
  VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
  MODE = import.meta.env.MODE || "development";
} catch {
  // non-Vite runtime (Node test runner)
}
// source-analysis: local dev fallback http://localhost:3001

const BASE_URL = VITE_API_BASE_URL;
const ACCESS_TOKEN_KEY = "hermes.auth.accessToken";

export function getApiBaseUrl() {
  const shim = globalThis.importMetaEnvShim;
  const raw = (shim?.VITE_API_BASE_URL ?? VITE_API_BASE_URL) || "";
  const mode = shim?.MODE ?? MODE;
  const base = String(raw).trim().replace(/\/+$/, "");

  if (!base) {
    if (mode === "development") return "";
    throw new Error(
      "VITE_API_BASE_URL is not set. For production, set VITE_API_BASE_URL to your Railway API base URL."
    );
  }
  return base;
}

export function apiUrl(path) {
  return `${getApiBaseUrl()}${path}`;
}

function getAuthHeaders(accessToken) {
  const storage = typeof window !== "undefined" ? window.localStorage : null;
  const token = accessToken || storage?.getItem(ACCESS_TOKEN_KEY);
  if (!token) return {};
  return {
    authorization: `Bearer ${token}`
  };
}

async function readResponseBody(response) {
  const raw = await response.text();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function errorMessageFromBody(body, status) {
  if (typeof body === "string" && body.trim()) {
    const text = body.trim();
    if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
      const preMatch = text.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
      const snippet = preMatch?.[1]?.trim() ?? "Route not found";
      return `${snippet} (HTTP ${status}). Is the backend running on ${BASE_URL}?`;
    }
    return text;
  }
  if (body && typeof body === "object") {
    return body.error || body.message || `Request failed: ${status}`;
  }
  return `Request failed: ${status}`;
}

async function parseResponse(response) {
  const body = await readResponseBody(response);

  if (!response.ok) {
    const message = errorMessageFromBody(body, response.status);
    const suffix = message.includes(`HTTP ${response.status}`) ? "" : ` (HTTP ${response.status})`;
    const error = new Error(`${message}${suffix}`);
    error.status = response.status;
    if (body && typeof body === "object") {
      error.code = body.code || body.errorCode || null;
      error.requestId = body.requestId || body.request_id || response.headers.get("x-request-id") || null;
      error.responseBody = body;
    } else {
      error.code = null;
      error.requestId = response.headers.get("x-request-id") || null;
      error.responseBody = body;
    }
    throw error;
  }

  return body;
}

export async function apiGet(path, { accessToken } = {}) {
  const response = await fetch(apiUrl(path), {
    headers: getAuthHeaders(accessToken)
  });
  return parseResponse(response);
}

export async function apiPost(path, body, { accessToken } = {}) {
  const response = await fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders(accessToken) },
    body: JSON.stringify(body)
  });
  return parseResponse(response);
}

export async function apiPostForm(path, formData, { accessToken } = {}) {
  const response = await fetch(apiUrl(path), {
    method: "POST",
    headers: getAuthHeaders(accessToken),
    body: formData
  });
  return parseResponse(response);
}

export async function apiPatch(path, body, { accessToken } = {}) {
  const response = await fetch(apiUrl(path), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeaders(accessToken) },
    body: JSON.stringify(body)
  });
  return parseResponse(response);
}

export async function apiDelete(path, body, { accessToken } = {}) {
  const response = await fetch(apiUrl(path), {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...getAuthHeaders(accessToken) },
    body: JSON.stringify(body ?? {})
  });
  return parseResponse(response);
}

export async function apiDownload(path, filename) {
  const response = await fetch(apiUrl(path));
  if (!response.ok) {
    const body = await readResponseBody(response);
    throw new Error(errorMessageFromBody(body, response.status));
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
