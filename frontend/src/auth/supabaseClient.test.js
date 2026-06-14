import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { test } from "node:test";

import { buildDiscordRedirectToFromAppUrl, createSupabaseBrowserClientFrom, loadSupabaseBrowserConfig } from "./supabaseClient.js";

const here = dirname(fileURLToPath(import.meta.url));

test("source must not use optional chaining on import.meta.env", () => {
  const source = readFileSync(join(here, "supabaseClient.js"), "utf8");
  assert.doesNotMatch(source, /import\.meta\?\.env/);
  assert.doesNotMatch(source, /import\.meta\.env\?/);
});

test("source guards relative URL fallback behind MODE === development check", () => {
  const source = readFileSync(join(here, "supabaseClient.js"), "utf8");
  assert.match(source, /if\s*\(\s*MODE\s*===\s*["']development["']\s*\)/);
});

test("discord redirect points back to the Hades app", () => {
  assert.equal(buildDiscordRedirectToFromAppUrl("https://hades.example"), "https://hades.example/app/home");
  assert.equal(buildDiscordRedirectToFromAppUrl("https://hades.example/"), "https://hades.example/app/home");
});

test("supabase browser client returns null when config is missing", () => {
  assert.equal(createSupabaseBrowserClientFrom({ supabaseUrl: "", supabaseAnonKey: "key" }), null);
  assert.equal(createSupabaseBrowserClientFrom({ supabaseUrl: "https://project.supabase.co", supabaseAnonKey: "" }), null);
});

test("production browser-config request uses VITE_API_BASE_URL as primary URL", async () => {
  const config = await loadSupabaseBrowserConfig({
    apiBaseUrl: "https://api.railway.example",
    fetchImpl: async (url) => {
      assert.equal(url, "https://api.railway.example/api/auth/browser-config");
      return {
        ok: true,
        async json() {
          return {
            supabaseUrl: "https://runtime.supabase.co",
            supabaseAnonKey: "sb_publishable_runtime",
            appUrl: "https://hades.example"
          };
        }
      };
    }
  });

  assert.deepEqual(config, {
    supabaseUrl: "https://runtime.supabase.co",
    supabaseAnonKey: "sb_publishable_runtime",
    appUrl: "https://hades.example"
  });
});

test("same-origin /api/auth/browser-config is only a fallback when VITE_API_BASE_URL is unset", async () => {
  const config = await loadSupabaseBrowserConfig({
    fetchImpl: async (url) => {
      assert.equal(url, "/api/auth/browser-config");
      return {
        ok: true,
        async json() {
          return {
            supabaseUrl: "https://proxy.supabase.co",
            supabaseAnonKey: "sb_publishable_proxy",
            appUrl: "https://proxy.example"
          };
        }
      };
    }
  });

  assert.deepEqual(config, {
    supabaseUrl: "https://proxy.supabase.co",
    supabaseAnonKey: "sb_publishable_proxy",
    appUrl: "https://proxy.example"
  });
});

test("falls back to env config when absolute browser-config request fails", async () => {
  const config = await loadSupabaseBrowserConfig({
    apiBaseUrl: "https://api.railway.example",
    envConfig: {
      supabaseUrl: "https://env.supabase.co",
      supabaseAnonKey: "sb_publishable_env",
      appUrl: "https://env.example"
    },
    fetchImpl: async (url) => {
      if (url === "https://api.railway.example/api/auth/browser-config") {
        return { ok: false };
      }
      if (url === "/api/auth/browser-config") {
        return { ok: false };
      }
      return { ok: false };
    }
  });

  assert.deepEqual(config, {
    supabaseUrl: "https://env.supabase.co",
    supabaseAnonKey: "sb_publishable_env",
    appUrl: "https://env.example"
  });
});

test("frontend never reads or exposes service role key from browser-config response", async () => {
  const config = await loadSupabaseBrowserConfig({
    apiBaseUrl: "https://api.railway.example",
    fetchImpl: async (url) => ({
      ok: true,
      async json() {
        return {
          supabaseUrl: "https://runtime.supabase.co",
          supabaseAnonKey: "sb_publishable_runtime",
          supabaseServiceRoleKey: "should-not-leak",
          appUrl: "https://hades.example"
        };
      }
    })
  });

  assert.equal("supabaseServiceRoleKey" in config, false, "frontend must not expose service role key");
  assert.equal(config.supabaseAnonKey, "sb_publishable_runtime", "anon key is the publishable one");
});

test("createSupabaseBrowserClientFrom initializes Supabase with valid config", () => {
  const client = createSupabaseBrowserClientFrom({
    supabaseUrl: "https://project.supabase.co",
    supabaseAnonKey: "sb_publishable_key"
  });
  assert.notEqual(client, null);
  assert.equal(typeof client.auth.signInWithOAuth, "function");
});
