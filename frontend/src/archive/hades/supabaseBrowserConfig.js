export function buildSupabaseBrowserConfig() {
  return {
    supabaseUrl: import.meta?.env?.VITE_SUPABASE_URL || "",
    supabaseAnonKey: import.meta?.env?.VITE_SUPABASE_ANON_KEY || "",
    appUrl: import.meta?.env?.VITE_APP_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:5173")
  };
}
