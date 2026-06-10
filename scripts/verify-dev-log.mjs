#!/usr/bin/env node
import { readFile, readdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const agentDir = join(repoRoot, "work-log/dev-logs/agent");

const files = (await readdir(agentDir)).filter((f) => f.endsWith(".json")).sort();
const latest = files[files.length - 1];
const agentPath = join(agentDir, latest);
const humanName = latest.replace("_dev-log-agent_", "_dev-log_").replace(/\.json$/, ".md");
const humanPath = join(repoRoot, "work-log/dev-logs/human", humanName);

const agent = JSON.parse(await readFile(agentPath, "utf8"));
const human = await readFile(humanPath, "utf8");

const required = ["meta", "summary", "apis", "git", "tests", "repositoryTree", "changes", "decisions"];
const missing = required.filter((k) => !(k in agent));

console.log("Latest pair:");
console.log("  agent:", agentPath.replace(repoRoot + "/", ""));
console.log("  human:", humanPath.replace(repoRoot + "/", ""));

let failed = 0;
function assert(name, ok) {
  console.log(ok ? "  PASS" : "  FAIL", name);
  if (!ok) failed += 1;
}

assert("agent JSON has required keys", missing.length === 0);
assert("apis.http.active > 0", agent.apis.http.active.length > 0);
assert("repositoryTree.treeText present", agent.repositoryTree.treeText.length > 100);
assert("treeIgnoreFlag set", agent.repositoryTree.treeIgnoreFlag?.includes("node_modules"));
assert("tests ran", agent.tests.ran === true);

assert("human: TOC", human.includes("## Table of contents"));
assert("human: Part I", human.includes("Part I — Summary"));
assert("human: Part II", human.includes("Part II — Detailed"));
assert("human: mermaid blocks", (human.match(/```mermaid/g) || []).length >= 3);
assert("human: I.3 API summary", human.includes("I.3 API surface"));
assert("human: I.5 test audit", human.includes("I.5 Test audit"));
assert("human: II.10 full tree", human.includes("II.10 Repository tree"));

const treeSection = human.split("II.10 Repository tree")[1] || "";
assert("tree excludes node_modules dir", !treeSection.includes("node_modules/"));

console.log("\nTests:", agent.tests.summary);
console.log(failed === 0 ? "\nAll checks passed." : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
