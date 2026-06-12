import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const hadesApiSource = readFileSync(join(here, "hadesApi.js"), "utf8");
const apiClientSource = readFileSync(join(here, "../../shared/api/client.js"), "utf8");

test("Hades hosted API helpers do not reference server-only secrets", () => {
  const source = `${hadesApiSource}\n${apiClientSource}`;

  assert.doesNotMatch(source, /OPENROUTER_API_KEY/);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(source, /SUPABASE_ANON_KEY/);
});

test("Hades hosted write helpers use the shared API client", () => {
  assert.match(hadesApiSource, /apiPost\("\/api\/hades\/chat"/);
  assert.match(hadesApiSource, /apiPost\("\/api\/hades\/minions\/test"/);
  assert.match(hadesApiSource, /apiPost\("\/api\/hades\/minions"/);
  assert.match(hadesApiSource, /apiPost\("\/api\/hades\/assignments"/);
});
