import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));

function mockSupabase() {
  const auth = {
    signUp: async (credentials) => ({ data: { user: { id: "new-user" } }, error: null }),
    signInWithPassword: async (credentials) => ({ data: { user: { id: "existing-user" }, session: { access_token: "tok" } }, error: null }),
    signInWithOAuth: async ({ provider, options }) => ({ data: { provider, url: options?.redirectTo || "https://accounts.example.com" }, error: null }),
    signOut: async () => ({ error: null }),
    getSession: async () => ({ data: { session: { user: { id: "existing-user" } } } })
  };
  return { auth };
}

function makeLocation(overrides = {}) {
  return {
    origin: "https://hades.example.com",
    pathname: "/login",
    search: "",
    ...overrides
  };
}

test("source must not use optional chaining on import.meta.env", () => {
  const source = readFileSync(join(here, "authClient.js"), "utf8");
  assert.doesNotMatch(source, /import\.meta\?\.env/);
  assert.doesNotMatch(source, /import\.meta\.env\?/);
});

test("signUpWithEmail calls supabase.auth.signUp with email and password", async () => {
  const { signUpWithEmail } = await import("./authClient.js");
  const supabase = mockSupabase();
  const result = await signUpWithEmail(supabase, "new@test.com", "password123");
  assert.equal(result.data.user.id, "new-user");
  assert.equal(result.error, null);
});

test("signUpWithEmail rejects password shorter than 8 characters", async () => {
  const { signUpWithEmail } = await import("./authClient.js");
  const supabase = mockSupabase();
  const result = await signUpWithEmail(supabase, "test@test.com", "1234567");
  assert.ok(result.error);
  assert.match(result.error.message, /at least 8|8 characters/i);
  assert.equal(result.data, null);
});

test("signUpWithEmail rejects empty password", async () => {
  const { signUpWithEmail } = await import("./authClient.js");
  const supabase = mockSupabase();
  const result = await signUpWithEmail(supabase, "test@test.com", "");
  assert.ok(result.error);
  assert.match(result.error.message, /password/i);
  assert.equal(result.data, null);
});

test("signInWithEmail calls supabase.auth.signInWithPassword", async () => {
  const { signInWithEmail } = await import("./authClient.js");
  const supabase = mockSupabase();
  const result = await signInWithEmail(supabase, "user@test.com", "password123");
  assert.equal(result.data.user.id, "existing-user");
  assert.equal(result.error, null);
});

test("signInWithGoogle calls supabase.auth.signInWithOAuth with google provider", async () => {
  const { signInWithGoogle } = await import("./authClient.js");
  const supabase = mockSupabase();
  const loc = makeLocation();
  const result = await signInWithGoogle(supabase, loc);
  assert.equal(result.data.provider, "google");
  assert.equal(result.error, null);
  assert.equal(result.data.url, "https://hades.example.com/app");
});

test("signInWithDiscord calls supabase.auth.signInWithOAuth with discord provider", async () => {
  const { signInWithDiscord } = await import("./authClient.js");
  const supabase = mockSupabase();
  const loc = makeLocation();
  const result = await signInWithDiscord(supabase, loc);
  assert.equal(result.data.provider, "discord");
  assert.equal(result.error, null);
  assert.equal(result.data.url, "https://hades.example.com/app");
});

test("signInWithDiscord returns friendly error when provider not enabled", async () => {
  const { signInWithDiscord } = await import("./authClient.js");
  const supabase = {
    auth: {
      signInWithOAuth: async () => ({
        data: null,
        error: new Error("Unsupported provider: provider is not enabled")
      })
    }
  };
  const result = await signInWithDiscord(supabase);
  assert.ok(result.error);
  assert.doesNotMatch(result.error.message, /provider is not enabled/i);
  assert.match(result.error.message, /not available/i);
});

test("signInWithDiscord passes through non-provider OAuth errors", async () => {
  const { signInWithDiscord } = await import("./authClient.js");
  const supabase = {
    auth: {
      signInWithOAuth: async () => ({
        data: null,
        error: new Error("Network error")
      })
    }
  };
  const result = await signInWithDiscord(supabase);
  assert.ok(result.error);
  assert.equal(result.error.message, "Network error");
});

test("signInWithGoogle returns friendly error when provider not enabled", async () => {
  const { signInWithGoogle } = await import("./authClient.js");
  const supabase = {
    auth: {
      signInWithOAuth: async () => ({
        data: null,
        error: new Error("Unsupported provider: provider is not enabled")
      })
    }
  };
  const result = await signInWithGoogle(supabase);
  assert.ok(result.error);
  assert.doesNotMatch(result.error.message, /provider is not enabled/i);
  assert.match(result.error.message, /not available/i);
});

test("signInWithApple returns friendly error when provider not enabled", async () => {
  const { signInWithApple } = await import("./authClient.js");
  const supabase = {
    auth: {
      signInWithOAuth: async () => ({
        data: null,
        error: new Error("Unsupported provider: provider is not enabled")
      })
    }
  };
  const result = await signInWithApple(supabase);
  assert.ok(result.error);
  assert.doesNotMatch(result.error.message, /provider is not enabled/i);
  assert.match(result.error.message, /not available/i);
});

test("signOutUser calls supabase.auth.signOut", async () => {
  const { signOutUser } = await import("./authClient.js");
  const supabase = mockSupabase();
  const result = await signOutUser(supabase);
  assert.equal(result.error, null);
});

test("getCurrentSession returns session from supabase.auth.getSession", async () => {
  const { getCurrentSession } = await import("./authClient.js");
  const supabase = mockSupabase();
  const session = await getCurrentSession(supabase);
  assert.equal(session.user.id, "existing-user");
});

test("getCurrentSession returns null when no client", async () => {
  const { getCurrentSession } = await import("./authClient.js");
  const session = await getCurrentSession(null);
  assert.equal(session, null);
});

test("signInWithGoogle returns error when no client", async () => {
  const { signInWithGoogle } = await import("./authClient.js");
  const result = await signInWithGoogle(null);
  assert.ok(result.error);
  assert.match(result.error.message, /Supabase/);
});

test("signInWithDiscord returns error when no client", async () => {
  const { signInWithDiscord } = await import("./authClient.js");
  const result = await signInWithDiscord(null);
  assert.ok(result.error);
  assert.match(result.error.message, /Supabase/);
});

test("signUpWithEmail returns error when no client", async () => {
  const { signUpWithEmail } = await import("./authClient.js");
  const result = await signUpWithEmail(null, "a@b.com", "p");
  assert.ok(result.error);
  assert.match(result.error.message, /Supabase/);
});

test("signInWithEmail returns error when no client", async () => {
  const { signInWithEmail } = await import("./authClient.js");
  const result = await signInWithEmail(null, "a@b.com", "p");
  assert.ok(result.error);
  assert.match(result.error.message, /Supabase/);
});

test("signOutUser returns error when no client", async () => {
  const { signOutUser } = await import("./authClient.js");
  const result = await signOutUser(null);
  assert.ok(result.error);
  assert.match(result.error.message, /Supabase/);
});

test("signInWithApple calls supabase.auth.signInWithOAuth with apple provider", async () => {
  const { signInWithApple } = await import("./authClient.js");
  const supabase = mockSupabase();
  const loc = makeLocation();
  const result = await signInWithApple(supabase, loc);
  assert.equal(result.data.provider, "apple");
  assert.equal(result.error, null);
  assert.equal(result.data.url, "https://hades.example.com/app");
});

test("signInWithApple returns error when no client", async () => {
  const { signInWithApple } = await import("./authClient.js");
  const result = await signInWithApple(null);
  assert.ok(result.error);
  assert.match(result.error.message, /Supabase/);
});

test("forgotPassword calls supabase.auth.resetPasswordForEmail with redirectTo", async () => {
  const { forgotPassword } = await import("./authClient.js");
  let resetArgs = null;
  const supabase = {
    auth: {
      resetPasswordForEmail: async (email, options) => {
        resetArgs = { email, options };
        return { data: {}, error: null };
      }
    }
  };
  const result = await forgotPassword(supabase, "user@test.com", { redirectTo: "https://hades.example.com/reset-password" });
  assert.equal(result.error, null);
  assert.equal(resetArgs.email, "user@test.com");
  assert.equal(resetArgs.options.redirectTo, "https://hades.example.com/reset-password");
});

test("forgotPassword returns error when no client", async () => {
  const { forgotPassword } = await import("./authClient.js");
  const result = await forgotPassword(null, "user@test.com");
  assert.ok(result.error);
  assert.match(result.error.message, /Supabase/);
});

test("needsEmailConfirmation returns true when user created but no session", async () => {
  const { needsEmailConfirmation } = await import("./authClient.js");
  assert.equal(needsEmailConfirmation({ data: { user: { id: "1" }, session: null }, error: null }), true);
});

test("needsEmailConfirmation returns false when session exists", async () => {
  const { needsEmailConfirmation } = await import("./authClient.js");
  assert.equal(needsEmailConfirmation({ data: { user: { id: "1" }, session: { access_token: "tok" } }, error: null }), false);
});

test("needsEmailConfirmation returns false when there is an error", async () => {
  const { needsEmailConfirmation } = await import("./authClient.js");
  assert.equal(needsEmailConfirmation({ data: null, error: new Error("fail") }), false);
});

test("needsEmailConfirmation returns false when data is null", async () => {
  const { needsEmailConfirmation } = await import("./authClient.js");
  assert.equal(needsEmailConfirmation({ data: null, error: null }), false);
});
