import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { findMiniModuleViolations } from "./check-parent-mini-modules.mjs";
import { findModuleBoundaryViolations } from "./check-module-boundaries.mjs";

const PARENT = "example-workspace";

test("mini-module: barrel import is allowed", () => {
  const root = mkdtempSync(join(tmpdir(), "mini-mod-"));
  const modulesDir = join(root, "modules");
  const file = join(modulesDir, PARENT, "mini-a", "services", "x.js");
  mkdirSync(join(modulesDir, PARENT, "mini-a", "services"), { recursive: true });
  mkdirSync(join(modulesDir, PARENT, "mini-b"), { recursive: true });
  writeFileSync(file, `import { load } from "../../mini-b/index.js";\n`, "utf8");

  const violations = findMiniModuleViolations({ modulesDir, skipBackend: true });
  assert.equal(violations.length, 0);
  rmSync(root, { recursive: true, force: true });
});

test("mini-module: deep sibling import is forbidden", () => {
  const root = mkdtempSync(join(tmpdir(), "mini-mod-"));
  const modulesDir = join(root, "modules");
  const file = join(modulesDir, PARENT, "mini-a", "services", "x.js");
  mkdirSync(join(modulesDir, PARENT, "mini-a", "services"), { recursive: true });
  writeFileSync(file, `import X from "../../mini-b/components/Bad.jsx";\n`, "utf8");

  const violations = findMiniModuleViolations({ modulesDir, skipBackend: true });
  assert.equal(violations.length, 1);
  assert.match(violations[0].specifier, /mini-b\/components/);
  rmSync(root, { recursive: true, force: true });
});

test("backend mini-module: barrel import is allowed", () => {
  const root = mkdtempSync(join(tmpdir(), "backend-mini-"));
  const modulesDir = join(root, "modules");
  const file = join(modulesDir, PARENT, "mini-a", "services", "x.js");
  mkdirSync(join(modulesDir, PARENT, "mini-a", "services"), { recursive: true });
  mkdirSync(join(modulesDir, PARENT, "mini-b"), { recursive: true });
  writeFileSync(file, `import { classify } from "../../mini-b/index.js";\n`, "utf8");

  const violations = findMiniModuleViolations({ backendModulesDir: modulesDir, skipFrontend: true });
  assert.equal(violations.length, 0);
  rmSync(root, { recursive: true, force: true });
});

test("backend mini-module: deep sibling import is forbidden", () => {
  const root = mkdtempSync(join(tmpdir(), "backend-mini-"));
  const modulesDir = join(root, "modules");
  const file = join(modulesDir, PARENT, "mini-a", "services", "x.js");
  mkdirSync(join(modulesDir, PARENT, "mini-a", "services"), { recursive: true });
  writeFileSync(file, `import X from "../../mini-b/services/parse-route.service.js";\n`, "utf8");

  const violations = findMiniModuleViolations({ backendModulesDir: modulesDir, skipFrontend: true });
  assert.equal(violations.length, 1);
  assert.match(violations[0].specifier, /mini-b\/services/);
  rmSync(root, { recursive: true, force: true });
});

test("cross-module: relative imports between modules are forbidden", () => {
  const root = mkdtempSync(join(tmpdir(), "cross-mod-"));
  const frontendRoot = join(root, "frontend");
  const modulesDir = join(frontendRoot, "src/modules");
  const file = join(modulesDir, "billing", "pages", "Bad.jsx");
  mkdirSync(join(modulesDir, "billing", "pages"), { recursive: true });
  writeFileSync(
    file,
    `import { listItems } from "../../orders/services/orders.service.js";\n`,
    "utf8"
  );

  const violations = findModuleBoundaryViolations({
    apps: [
      {
        name: "frontend",
        root: frontendRoot,
        modulesSubpath: "src/modules"
      }
    ]
  });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].rule, "relative-cross-module");
  assert.equal(violations[0].other, "orders");
  rmSync(root, { recursive: true, force: true });
});
