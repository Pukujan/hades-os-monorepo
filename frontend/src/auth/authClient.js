import { buildOAuthRedirectTo } from "./authRedirects.js";

function clientError() {
  return { error: new Error("Supabase auth client is not available."), data: null };
}

export async function signUpWithEmail(supabase, email, password) {
  if (!supabase) return clientError();
  return supabase.auth.signUp({ email, password });
}

export async function signInWithEmail(supabase, email, password) {
  if (!supabase) return clientError();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signInWithGoogle(supabase, location) {
  if (!supabase) return clientError();
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: buildOAuthRedirectTo(location) }
  });
}

export async function signInWithDiscord(supabase, location) {
  if (!supabase) return clientError();
  return supabase.auth.signInWithOAuth({
    provider: "discord",
    options: { redirectTo: buildOAuthRedirectTo(location) }
  });
}

export async function signInWithApple(supabase, location) {
  if (!supabase) return clientError();
  return supabase.auth.signInWithOAuth({
    provider: "apple",
    options: { redirectTo: buildOAuthRedirectTo(location) }
  });
}

export async function signInWithTelegram(supabase, location) {
  if (!supabase) return clientError();
  return supabase.auth.signInWithOAuth({
    provider: "telegram",
    options: { redirectTo: buildOAuthRedirectTo(location) }
  });
}

export async function forgotPassword(supabase, email, options = {}) {
  if (!supabase) return clientError();
  const redirectTo = options.redirectTo || (typeof window !== "undefined" ? `${window.location.origin}/reset-password` : "/reset-password");
  return supabase.auth.resetPasswordForEmail(email, { redirectTo });
}

export async function signOutUser(supabase) {
  if (!supabase) return { error: new Error("Supabase auth client is not available."), data: null };
  return supabase.auth.signOut();
}

export async function getCurrentSession(supabase) {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}
