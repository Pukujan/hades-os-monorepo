import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "client.js"), "utf8");

test("frontend API client uses VITE_API_BASE_URL as the only backend origin env", () => {
  assert.match(source, /VITE_API_BASE_URL/);
  assert.doesNotMatch(source, /OPENROUTER_API_KEY/);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(source, /SUPABASE_ANON_KEY/);
});

test("frontend API client must not use optional chaining on import.meta.env", () => {
  assert.doesNotMatch(source, /import\.meta\?\.env/);
  assert.doesNotMatch(source, /import\.meta\.env\?/);
});

test("frontend API client keeps the local backend fallback explicit", () => {
  assert.match(source, /http:\/\/localhost:3001|http:\/\/127\.0\.0\.1:3001/);
});

test("frontend API client includes the auth token bridge", () => {
  assert.match(source, /hades\.auth\.accessToken/);
  assert.match(source, /authorization: `Bearer \$\{token\}`/);
});
