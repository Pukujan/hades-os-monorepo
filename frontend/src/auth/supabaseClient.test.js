import assert from "node:assert/strict";
import { test } from "node:test";

import { buildDiscordRedirectToFromAppUrl, createSupabaseBrowserClientFrom, loadSupabaseBrowserConfig } from "./supabaseClient.js";

test("discord redirect points back to the Hades app", () => {
  assert.equal(buildDiscordRedirectToFromAppUrl("https://hades.example"), "https://hades.example/app/home");
  assert.equal(buildDiscordRedirectToFromAppUrl("https://hades.example/"), "https://hades.example/app/home");
});

test("supabase browser client returns null when config is missing", () => {
  assert.equal(createSupabaseBrowserClientFrom({ supabaseUrl: "", supabaseAnonKey: "key" }), null);
  assert.equal(createSupabaseBrowserClientFrom({ supabaseUrl: "https://project.supabase.co", supabaseAnonKey: "" }), null);
});

test("browser config prefers the backend public config endpoint", async () => {
  const config = await loadSupabaseBrowserConfig({
    apiBaseUrl: "http://127.0.0.1:3001",
    fetchImpl: async (url) => {
      assert.equal(url, "http://127.0.0.1:3001/api/auth/browser-config");
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

test("browser config first tries the local proxy path", async () => {
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
