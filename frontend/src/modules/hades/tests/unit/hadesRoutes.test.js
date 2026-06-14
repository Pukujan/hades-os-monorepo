import { test } from "node:test";
import assert from "node:assert/strict";

test("HADES_APP_ROUTES contains all expected routes", async () => {
  const { HADES_APP_ROUTES } = await import("../../hadesRoutes.js");

  assert.ok(Array.isArray(HADES_APP_ROUTES));
  assert.ok(HADES_APP_ROUTES.length >= 6);

  const ids = HADES_APP_ROUTES.map((r) => r.id);
  assert.ok(ids.includes("home"));
  assert.ok(ids.includes("forge"));
  assert.ok(ids.includes("socials"));
  assert.ok(ids.includes("settings"));
});

test("each route has required fields", async () => {
  const { HADES_APP_ROUTES } = await import("../../hadesRoutes.js");

  for (const route of HADES_APP_ROUTES) {
    assert.equal(typeof route.id, "string", `route ${route.id} missing id`);
    assert.equal(typeof route.label, "string", `route ${route.id} missing label`);
    assert.equal(typeof route.path, "string", `route ${route.id} missing path`);
    assert.equal(typeof route.description, "string", `route ${route.id} missing description`);
    assert.ok(Array.isArray(route.keywords), `route ${route.id} missing keywords`);
    assert.ok(route.path.startsWith("/"), `route ${route.id} path must start with /`);
  }
});

test("routes have distinct ids", async () => {
  const { HADES_APP_ROUTES } = await import("../../hadesRoutes.js");

  const ids = HADES_APP_ROUTES.map((r) => r.id);
  const unique = new Set(ids);
  assert.equal(unique.size, ids.length, "route ids must be unique");
});
