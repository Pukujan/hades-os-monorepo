import { describe, it } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const sourcePath = resolve(__dirname, "LoginPage.jsx");

describe("LoginPage.jsx — email confirmation UI", () => {
  const source = readFileSync(sourcePath, "utf-8");

  it("imports needsEmailConfirmation from authClient", () => {
    assert.match(source, /import.*needsEmailConfirmation.*from\s+["']\.\/authClient\.js["']/);
  });

  it("stores signup result to check for email confirmation", () => {
    assert.match(source, /needsEmailConfirmation\s*\(/);
  });

  it("shows a confirmation message when email verification is required", () => {
    assert.match(source, /check your email|confirmation|verify.*email/i);
  });
});

describe("LoginPage.jsx — inline error display", () => {
  const source = readFileSync(sourcePath, "utf-8");

  it("creates an inline error element for email auth errors", () => {
    assert.match(source, /error-message|errorMessage|inline.*error/i);
  });

  it("sets inline error text instead of calling window.alert for email signup errors", () => {
    assert.match(source, /handleEmailSignUp[\s\S]*?showInlineError\(/);
    assert.doesNotMatch(source, /const \{ error \} = await signUpWithEmail/);
  });
});

describe("LoginPage.jsx — OAuth handlers use showInlineError", () => {
  const source = readFileSync(sourcePath, "utf-8");

  it("handleDiscordSignIn shows inline error instead of window.alert", () => {
    assert.match(source, /handleDiscordSignIn[\s\S]*?if\s*\(error\)\s*showInlineError\(/);
  });

  it("handleGoogleSignIn shows inline error instead of window.alert", () => {
    assert.match(source, /handleGoogleSignIn[\s\S]*?if\s*\(error\)\s*showInlineError\(/);
  });

  it("handleTelegramSignIn shows inline error instead of window.alert", () => {
    assert.match(source, /handleTelegramSignIn[\s\S]*?if\s*\(error\)\s*showInlineError\(/);
  });

  it("handleAppleSignIn shows inline error instead of window.alert", () => {
    assert.match(source, /handleAppleSignIn[\s\S]*?if\s*\(error\)\s*showInlineError\(/);
  });
});

describe("LoginPage.jsx — guard clauses use showInlineError", () => {
  const source = readFileSync(sourcePath, "utf-8");

  it("replaces supabase guard window.alert with showInlineError", () => {
    assert.doesNotMatch(source, /window\.alert\("Supabase auth is not configured yet\."\)/);
    assert.match(source, /showInlineError\([^)]*"Supabase auth is not configured yet\."\)/);
  });

  it("replaces email/password guard window.alert with showInlineError", () => {
    assert.doesNotMatch(source, /window\.alert\("Enter an email and password first\."\)/);
    assert.match(source, /showInlineError\([^)]*"Enter an email and password first\."\)/);
  });

  it("replaces email guard window.alert with showInlineError", () => {
    assert.doesNotMatch(source, /window\.alert\("Enter your email first\."\)/);
    assert.match(source, /showInlineError\([^)]*"Enter your email first\."\)/);
  });
});

describe("LoginPage.jsx — no window.alert for errors", () => {
  const source = readFileSync(sourcePath, "utf-8");

  it("no handler uses window.alert(error.message)", () => {
    assert.doesNotMatch(source, /if\s*\(error\)\s*window\.alert\(/);
  });

  it("no handler uses window.alert for success message", () => {
    assert.doesNotMatch(source, /window\.alert\("Password reset link sent\."\)/);
  });
});

describe("LoginPage.jsx — resetPassword handler uses inline messages", () => {
  const source = readFileSync(sourcePath, "utf-8");

  it("uses showInlineError for resetPassword errors", () => {
    assert.match(source, /resetPassword[\s\S]*?if\s*\(error\)\s*showInlineError\(/);
  });

  it("shows success message inline for resetPassword", () => {
    assert.match(source, /resetPassword[\s\S]*?success/i);
  });
});
