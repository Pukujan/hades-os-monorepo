import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const __src = readFileSync(resolve(__dirname, "../../pages/HadesPrototypeApp.jsx"), "utf-8");

// ── Route config (index.jsx) ──

test("HADES_APP_ROUTES: home tab is labeled 'HADES CHAT' after restructure", async () => {
  const { HADES_APP_ROUTES } = await import("../../index.jsx");
  const home = HADES_APP_ROUTES.find((r) => r.id === "home");
  assert.ok(home, "home route must exist");
  assert.equal(home.label, "HADES CHAT");
});

test("HADES_APP_ROUTES: forge tab is labeled 'MINIONS' after restructure", async () => {
  const { HADES_APP_ROUTES } = await import("../../index.jsx");
  const forge = HADES_APP_ROUTES.find((r) => r.id === "forge");
  assert.ok(forge, "forge route must exist");
  assert.equal(forge.label, "MINIONS");
});

test("HADES_APP_ROUTES: no route uses 'Forge' label", async () => {
  const { HADES_APP_ROUTES } = await import("../../index.jsx");
  const forgeLabeled = HADES_APP_ROUTES.filter((r) => r.label === "Forge");
  assert.equal(forgeLabeled.length, 0, "no route should have label 'Forge'");
});

test("HADES_APP_ROUTES: no duplicate 'minions' id entry", async () => {
  const { HADES_APP_ROUTES } = await import("../../index.jsx");
  const minionsRoutes = HADES_APP_ROUTES.filter((r) => r.id === "minions");
  assert.equal(minionsRoutes.length, 0, "duplicate 'minions' id should be removed");
});

// ── MOBILE_NAV config (hadesData.js) ──

test("MOBILE_NAV: minions entry labeled 'HADES CHAT'", async () => {
  const { MOBILE_NAV } = await import("../../utils/hadesData.js");
  const entry = MOBILE_NAV.find((n) => n.id === "minions");
  assert.ok(entry, "minions nav entry must exist");
  assert.equal(entry.label, "HADES CHAT");
});

test("MOBILE_NAV: forge entry labeled 'MINIONS'", async () => {
  const { MOBILE_NAV } = await import("../../utils/hadesData.js");
  const entry = MOBILE_NAV.find((n) => n.id === "forge");
  assert.ok(entry, "forge nav entry must exist");
  assert.equal(entry.label, "MINIONS");
});

test("MOBILE_NAV: no entry uses 'Forge' label", async () => {
  const { MOBILE_NAV } = await import("../../utils/hadesData.js");
  const matches = MOBILE_NAV.filter((n) => n.label === "Forge");
  assert.equal(matches.length, 0, "no mobile nav entry should have label 'Forge'");
});

test("MOBILE_NAV: no entry uses 'Minions' label (old name)", async () => {
  const { MOBILE_NAV } = await import("../../utils/hadesData.js");
  const matches = MOBILE_NAV.filter((n) => n.label === "Minions");
  assert.equal(matches.length, 0, "no mobile nav entry should have label 'Minions'");
});

// ── HadesPrototypeApp forge state & component removal ──
// Reads the full file source so checks cover HadesProvider, not just the default export wrapper.

test("HadesPrototypeApp: forge chat state variables are removed", () => {
  for (const key of ["forgeMessages", "forgeConversationId"]) {
    assert.equal(__src.includes(key), false, `state variable '${key}' should be removed`);
  }
});

test("HadesPrototypeApp: sendMessage no longer has forge context branching", () => {
  assert.equal(__src.includes('context === "forge"'), false, "forge context check should be removed");
  assert.equal(__src.includes("const isForge"), false, "isForge variable should be removed");
});

test("HadesPrototypeApp: does not import sendForgeChat", () => {
  assert.equal(__src.includes("sendForgeChat"), false, "sendForgeChat import should be removed");
});

test("HadesPrototypeApp: bottom nav shows 'HADES CHAT' and 'MINIONS' as tab labels", async () => {
  const { MOBILE_NAV } = await import("../../utils/hadesData.js");
  const labels = MOBILE_NAV.map((n) => n.label);
  assert.ok(labels.includes("HADES CHAT"), "bottom nav data should include 'HADES CHAT' label");
  assert.ok(labels.includes("MINIONS"), "bottom nav data should include 'MINIONS' tab label");
});

test("HadesPrototypeApp: MINIONS nav label appears exactly once (second tab)", async () => {
  const { MOBILE_NAV } = await import("../../utils/hadesData.js");
  const count = MOBILE_NAV.filter((n) => n.label === "MINIONS").length;
  assert.equal(count, 1, "exactly one MINIONS nav label should exist in MOBILE_NAV");
});

test("HadesPrototypeApp: HADES CHAT nav label appears exactly once (first tab)", async () => {
  const { MOBILE_NAV } = await import("../../utils/hadesData.js");
  const count = MOBILE_NAV.filter((n) => n.label === "HADES CHAT").length;
  assert.equal(count, 1, "exactly one HADES CHAT nav label should exist in MOBILE_NAV");
});
