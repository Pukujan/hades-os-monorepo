import { createClient } from "@supabase/supabase-js";

let VITE_API_BASE_URL = "";
let VITE_SUPABASE_URL = "";
let VITE_SUPABASE_ANON_KEY = "";
let VITE_APP_URL = "";
let MODE = "development";

try {
  VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
  VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
  VITE_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
  VITE_APP_URL = import.meta.env.VITE_APP_URL || "";
  MODE = import.meta.env.MODE || "development";
} catch {
  // non-Vite runtime (Node test runner)
}

function normalizeBaseUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

export function getSupabaseBrowserConfig() {
  return {
    supabaseUrl: VITE_SUPABASE_URL,
    supabaseAnonKey: VITE_SUPABASE_ANON_KEY,
    appUrl: VITE_APP_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:5173")
  };
}

export async function loadSupabaseBrowserConfig({
  fetchImpl = globalThis.fetch,
  apiBaseUrl = VITE_API_BASE_URL,
  envConfig = getSupabaseBrowserConfig()
} = {}) {
  if (typeof fetchImpl !== "function") {
    return envConfig;
  }

  const normalizedApiBaseUrl = normalizeBaseUrl(apiBaseUrl);

  if (normalizedApiBaseUrl) {
    try {
      const response = await fetchImpl(`${normalizedApiBaseUrl}/api/auth/browser-config`, {
        method: "GET",
        headers: { accept: "application/json" }
      });

      if (response?.ok) {
        const runtimeConfig = await response.json();
        return {
          supabaseUrl: runtimeConfig?.supabaseUrl || envConfig.supabaseUrl || "",
          supabaseAnonKey: runtimeConfig?.supabaseAnonKey || envConfig.supabaseAnonKey || "",
          appUrl: runtimeConfig?.appUrl || envConfig.appUrl || ""
        };
      }
    } catch {
      // Fall back to relative URL below.
    }
  }

  if (MODE === "development") {
    try {
      const relativeResponse = await fetchImpl("/api/auth/browser-config", {
        method: "GET",
        headers: { accept: "application/json" }
      });

      if (relativeResponse?.ok) {
        const runtimeConfig = await relativeResponse.json();
        return {
          supabaseUrl: runtimeConfig?.supabaseUrl || envConfig.supabaseUrl || "",
          supabaseAnonKey: runtimeConfig?.supabaseAnonKey || envConfig.supabaseAnonKey || "",
          appUrl: runtimeConfig?.appUrl || envConfig.appUrl || ""
        };
      }
    } catch {
      // Fall back to local env config below.
    }
  }

  return envConfig;
}

export function createSupabaseBrowserClientFrom({ supabaseUrl, supabaseAnonKey } = {}) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
}

export function createSupabaseBrowserClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseBrowserConfig();
  return createSupabaseBrowserClientFrom({ supabaseUrl, supabaseAnonKey });
}

export function buildDiscordRedirectToFromAppUrl(appUrl) {
  return `${String(appUrl || "").replace(/\/+$/, "")}/app/home`;
}

export function buildDiscordRedirectTo() {
  return buildDiscordRedirectToFromAppUrl(typeof window !== "undefined" ? window.location.origin : getSupabaseBrowserConfig().appUrl);
}
