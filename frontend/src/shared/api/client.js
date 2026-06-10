const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

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
    throw new Error(errorMessageFromBody(body, response.status));
  }

  return body;
}

export async function apiGet(path) {
  const response = await fetch(`${BASE_URL}${path}`);
  return parseResponse(response);
}

export async function apiPost(path, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return parseResponse(response);
}

export async function apiPostForm(path, formData) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    body: formData
  });
  return parseResponse(response);
}

export async function apiPatch(path, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return parseResponse(response);
}

export async function apiDelete(path, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {})
  });
  return parseResponse(response);
}

export async function apiDownload(path, filename) {
  const response = await fetch(`${BASE_URL}${path}`);
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
  URL.revokeObjectURL(url);
}
