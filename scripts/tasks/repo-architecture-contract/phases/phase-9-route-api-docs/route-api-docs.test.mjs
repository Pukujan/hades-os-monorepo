import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();

function full(relativePath) {
  return path.join(root, relativePath);
}

function exists(relativePath) {
  return fs.existsSync(full(relativePath));
}

function read(relativePath) {
  return fs.readFileSync(full(relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function runNpm(script) {
  return execFileSync("npm", ["run", script], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

const ALL_HADES_ROUTES = [
  { method: "GET", path: "/readiness", full: "/api/hades/readiness" },
  { method: "GET", path: "/bootstrap", full: "/api/hades/bootstrap" },
  { method: "POST", path: "/chat", full: "/api/hades/chat" },
  { method: "POST", path: "/chat/general", full: "/api/hades/chat/general" },
  { method: "POST", path: "/chat/forge", full: "/api/hades/chat/forge" },
  { method: "POST", path: "/minions/test", full: "/api/hades/minions/test" },
  { method: "POST", path: "/minions", full: "/api/hades/minions" },
  { method: "POST", path: "/assignments", full: "/api/hades/assignments" },
  { method: "POST", path: "/triggers", full: "/api/hades/triggers" },
  { method: "GET", path: "/conversations/:id/messages", full: "/api/hades/conversations/:id/messages" },
  { method: "DELETE", path: "/conversations/:id/messages", full: "/api/hades/conversations/:id/messages" },
  { method: "GET", path: "/socials", full: "/api/hades/socials" },
  { method: "POST", path: "/socials/telegram/token", full: "/api/hades/socials/telegram/token" },
  { method: "GET", path: "/minions", full: "/api/hades/minions" },
  { method: "GET", path: "/minions/:id", full: "/api/hades/minions/:id" },
  { method: "GET", path: "/minions/:id/logs", full: "/api/hades/minions/:id/logs" },
  { method: "GET", path: "/notifications", full: "/api/hades/notifications" },
  { method: "PATCH", path: "/minions/:id", full: "/api/hades/minions/:id" },
  { method: "DELETE", path: "/minions/:id", full: "/api/hades/minions/:id" }
];

test("check-api-docs script exists", () => {
  assert.ok(exists("scripts/check-api-docs.mjs"), "Missing scripts/check-api-docs.mjs");
});

test("lint:api-docs package script registered", () => {
  const pkg = readJson("package.json");
  assert.ok(pkg.scripts?.["lint:api-docs"], "package.json missing lint:api-docs");
  assert.ok(
    pkg.scripts["lint:api-docs"].includes("scripts/check-api-docs.mjs"),
    "lint:api-docs must run scripts/check-api-docs.mjs"
  );
});

test("lint:repo-architecture includes lint:api-docs", () => {
  const pkg = readJson("package.json");
  assert.ok(pkg.scripts?.["lint:repo-architecture"], "package.json missing lint:repo-architecture");
  assert.ok(
    pkg.scripts["lint:repo-architecture"].includes("lint:api-docs"),
    "lint:repo-architecture must include lint:api-docs in Phase 9"
  );
});

test("docs/hades/API.md documents all 19 Hades routes", () => {
  const docText = read("docs/hades/API.md");

  for (const { method, path: routePath } of ALL_HADES_ROUTES) {
    const methodOk =
      new RegExp(`\\b${method}\\b`, "i").test(docText) ||
      new RegExp(`\\| ${method} \\|`, "i").test(docText);
    const pathOk = docText.includes(routePath);
    assert.ok(
      methodOk && pathOk,
      `docs/hades/API.md must document ${method} ${routePath}`
    );
  }
});

test("docs/API.md endpoint registry has all 19 Hades routes", () => {
  const docText = read("docs/API.md");
  const start = docText.indexOf("## Endpoint registry");
  assert.ok(start >= 0, "docs/API.md missing ## Endpoint registry section");
  const section = docText.slice(start);
  const end = section.indexOf("\n## ", 4);
  const body = end >= 0 ? section.slice(0, end) : section;

  for (const { method, full: fullPath } of ALL_HADES_ROUTES) {
    const escapedPath = fullPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedMethod = method.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rowRe = new RegExp(
      "\\|\\s*(?:`)?" + escapedMethod + "(?:`)?\\s*\\|\\s*`" + escapedPath + "`\\s*\\|",
      "i"
    );
    assert.ok(
      rowRe.test(body),
      `docs/API.md Endpoint registry must have row for ${method} \`${fullPath}\``
    );
  }
});

test("lint:api-docs passes", () => {
  assert.doesNotThrow(
    () => runNpm("lint:api-docs"),
    "npm run lint:api-docs should pass (all routes documented)"
  );
});

test("metadata/apis.json no longer marks hades entries as pre-existing-api-doc-failures", () => {
  const apis = readJson("metadata/apis.json");
  for (const entry of apis.apis) {
    if (entry.module === "hades") {
      assert.notEqual(
        entry.apiDocsStatus,
        "pre-existing-api-doc-failures",
        `Hades API entry ${entry.name} must not remain pre-existing-api-doc-failures`
      );
    }
  }
});

test("metadata/architecture-fitness.json promotes api-doc-drift from deferred", () => {
  const fitness = readJson("metadata/architecture-fitness.json");

  const driftInDeferred = (fitness.deferredChecks ?? []).some(
    (c) => c.id === "api-doc-drift"
  );
  assert.ok(!driftInDeferred, "api-doc-drift must be removed from deferredChecks");

  const driftInImplemented = (fitness.implementedChecks ?? []).some(
    (c) => c.id === "api-doc-drift"
  );
  assert.ok(driftInImplemented, "api-doc-drift must be added to implementedChecks");
});

test("repo-architecture lint remains green", () => {
  assert.doesNotThrow(
    () => runNpm("lint:repo-architecture"),
    "npm run lint:repo-architecture should pass"
  );
});

test("Phase 9 work-log artifacts exist", () => {
  const requiredFiles = [
    "work-log/tasks/repo-architecture-contract/phases/phase-9-route-api-docs/metadata.json",
    "work-log/tasks/repo-architecture-contract/phases/phase-9-route-api-docs/plan.md",
    "work-log/tasks/repo-architecture-contract/phases/phase-9-route-api-docs/test-plan.md"
  ];
  for (const file of requiredFiles) {
    assert.ok(exists(file), `Missing Phase 9 work-log artifact: ${file}`);
  }
});

test("Project plan marks Phase 8 complete and Phase 9 present", () => {
  const body = read("docs/tasks/repo-architecture-contract/PROJECT_PLAN.md");
  assert.ok(
    body.includes("Phase 8") && body.includes("Complete"),
    "PROJECT_PLAN.md should mark Phase 8 complete"
  );
  assert.ok(
    body.includes("Phase 9"),
    "PROJECT_PLAN.md should include Phase 9"
  );
});
