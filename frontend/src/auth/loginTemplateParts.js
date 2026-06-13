export function extractLoginTemplateParts(template) {
  const source = String(template || "");
  const styleMatch = source.match(/<style>([\s\S]*?)<\/style>/i);
  const bodyMatch = source.match(/<body>([\s\S]*?)<\/body>/i);
  const frames = [...source.matchAll(/<img class="bg-frame[^"]*" src="(data:image\/png;base64,[^"]+)"/gi)].map((match) => match[1]);

  return {
    style: styleMatch?.[1]?.trim() || "",
    body: bodyMatch?.[1]?.replace(/<script[\s\S]*<\/script>\s*$/i, "").trim() || "",
    frames
  };
}

export function buildSupabaseBrowserConfig() {
  return {
    supabaseUrl: import.meta?.env?.VITE_SUPABASE_URL || "",
    supabaseAnonKey: import.meta?.env?.VITE_SUPABASE_ANON_KEY || "",
    appUrl: import.meta?.env?.VITE_APP_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:5173")
  };
}
