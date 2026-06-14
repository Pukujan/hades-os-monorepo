let VITE_API_BASE_URL = "";
let MODE = "development";

try {
  VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
  MODE = import.meta.env.MODE || "development";
} catch {
  // non-Vite runtime (Node test runner)
}

export function getApiBaseUrl() {
  const shim = globalThis.importMetaEnvShim;
  const raw = (shim?.VITE_API_BASE_URL ?? VITE_API_BASE_URL) || "";
  const mode = shim?.MODE ?? MODE;
  const base = String(raw).trim().replace(/\/+$/, "");

  if (base) return base;

  if (mode === "development") return "http://localhost:3001";

  throw new Error(
    "VITE_API_BASE_URL is not set. For production, set VITE_API_BASE_URL to your Railway API base URL."
  );
}

export function apiUrl(path) {
  return `${getApiBaseUrl()}${path}`;
}
