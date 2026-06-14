let VITE_SUPABASE_URL = "";
let VITE_SUPABASE_ANON_KEY = "";
let VITE_APP_URL = "";

try {
  VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
  VITE_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
  VITE_APP_URL = import.meta.env.VITE_APP_URL || "";
} catch {
  // non-Vite runtime (Node test runner)
}

export function getSupabaseBrowserConfig() {
  return {
    supabaseUrl: VITE_SUPABASE_URL,
    supabaseAnonKey: VITE_SUPABASE_ANON_KEY,
    appUrl: VITE_APP_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:5173")
  };
}
