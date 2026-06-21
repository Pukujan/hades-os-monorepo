import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

function readText(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

test("OpenCode config encodes the Codex planning and OpenCode build split", () => {
  const canonical = readJson("additional-modules/context-engineering/opencode.json");
  const rootConfigPath = join(repoRoot, "opencode.json");

  assert.ok(existsSync(rootConfigPath), "root opencode.json must exist because OpenCode loads project root config by default");
  assert.deepEqual(readJson("opencode.json"), canonical, "root opencode.json must stay in sync with the canonical config");

  assert.deepEqual(canonical.instructions, ["AGENTS.md", "CODE_IMPLEMENTATION.md"]);
  assert.equal(canonical.permission?.["*"], "ask");

  assert.equal(canonical.agent?.compaction?.model, "opencode-go/deepseek-v4-flash");

  const plan = canonical.agent?.plan;
  assert.equal(plan?.mode, "primary");
  assert.equal(plan?.permission?.edit, "deny");
  assert.equal(plan?.permission?.bash, "deny");
  assert.equal(plan?.permission?.task?.["*"], "deny");
  assert.equal(plan?.permission?.task?.explore, "allow");
  assert.equal(plan?.permission?.task?.scout, "allow");

  const build = canonical.agent?.build;
  assert.equal(build?.mode, "primary");
  assert.equal(build?.permission?.edit, "allow");
  assert.equal(build?.permission?.bash?.["*"], "ask");
  assert.equal(build?.permission?.bash?.["git status*"], "allow");
  assert.equal(build?.permission?.bash?.["git diff*"], "allow");
  assert.equal(build?.permission?.bash?.["rg *"], "allow");
});

test("delegated workflow docs and handoff templates exist with required gates", () => {
  const workflowPath = "docs/agent-workflows/codex-opencode-delegation.md";
  const planningTemplatePath = "docs/agent-workflows/templates/planning-handoff.md";
  const completionTemplatePath = "docs/agent-workflows/templates/completion-handoff.md";

  for (const relativePath of [workflowPath, planningTemplatePath, completionTemplatePath]) {
    assert.ok(existsSync(join(repoRoot, relativePath)), `${relativePath} must exist`);
  }

  const workflow = readText(workflowPath);
  for (const phrase of [
    "Codex owns planning",
    "OpenCode owns implementation",
    "User Context Packet",
    "Evidence Log",
    "Red Tests",
    "Hosted Verification",
    "thin proxy",
    "do not reimplement Hermes sessions"
  ]) {
    assert.match(workflow, new RegExp(phrase, "i"), `workflow doc must mention ${phrase}`);
  }

  const planningTemplate = readText(planningTemplatePath);
  for (const heading of [
    "User Context Packet",
    "Evidence Log",
    "Red Tests",
    "OpenCode Execution Scope",
    "Hosted Verification",
    "Stop Conditions"
  ]) {
    assert.match(planningTemplate, new RegExp(`^## ${heading}`, "m"), `planning handoff must include ${heading}`);
  }

  const completionTemplate = readText(completionTemplatePath);
  for (const heading of [
    "What Changed",
    "Tests And Verification",
    "Hosted Verification",
    "Reimplementation Check",
    "Drift Check",
    "Remaining Risks"
  ]) {
    assert.match(completionTemplate, new RegExp(`^## ${heading}`, "m"), `completion handoff must include ${heading}`);
  }
});

test("repo exposes a dedicated agent workflow contract command", () => {
  const pkg = readJson("package.json");
  assert.equal(pkg.scripts?.["test:agent-workflow"], "node --test scripts/agent-delegation-workflow.contract.test.mjs");
  assert.match(pkg.scripts?.["check:repo-architecture"] ?? "", /npm run test:agent-workflow/);
  assert.match(pkg.scripts?.["test:ci"] ?? "", /npm run test:agent-workflow/);

  const ci = readText(".github/workflows/ci.yml");
  assert.match(ci, /Agent workflow contract/);
  assert.match(ci, /npm run test:agent-workflow/);
});
