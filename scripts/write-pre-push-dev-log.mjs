#!/usr/bin/env node
/**
 * Create paired pre-push dev logs: human (markdown) + agent (JSON audit).
 *
 * Usage:
 *   npm run dev-log:pre-push -- --slug consolidated-exports
 *   npm run dev-log:pre-push -- --slug my-topic --program 005 --no-tests
 *   npm run dev-log:pre-push -- --check   # verify agent log exists for HEAD
 */
import { readFile, writeFile, mkdir, readdir } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { formatWorkLogTimestamp } from "../backend/src/shared/utils/formatExchangeTimestamp.js";
import { buildRepoTree, TREE_IGNORE_DIRS } from "./lib/repo-tree.mjs";
import { collectGitSnapshot } from "./lib/git-snapshot.mjs";
import { runTestSuite } from "./lib/run-tests.mjs";
import { collectApiInventory, formatApisMarkdown } from "./lib/api-inventory.mjs";
import { buildHumanDevLog } from "./lib/dev-log-human-format.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const humanDir = join(repoRoot, "work-log/dev-logs/human");
const agentDir = join(repoRoot, "work-log/dev-logs/agent");

function parseArgs(argv) {
  const out = { slug: "", program: "005", noTests: false, check: false, title: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--slug" && argv[i + 1]) out.slug = argv[++i];
    else if (a === "--program" && argv[i + 1]) out.program = argv[++i];
    else if (a === "--title" && argv[i + 1]) out.title = argv[++i];
    else if (a === "--no-tests") out.noTests = true;
    else if (a === "--check") out.check = true;
  }
  return out;
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function classifyChangedFiles(changedFiles) {
  const byArea = {};
  const added = [];
  const modified = [];
  const deleted = [];

  for (const { code, path } of changedFiles) {
    const area = path.split("/")[0] || "root";
    if (!byArea[area]) byArea[area] = [];
    byArea[area].push(path);
    if (code.includes("A") || code === "??") added.push(path);
    else if (code.includes("D")) deleted.push(path);
    else modified.push(path);
  }

  return { byArea, added, modified, deleted };
}

const exec = promisify(execFile);

async function gitCatFileExists(repoRoot, objectPath) {
  try {
    await exec("git", ["cat-file", "-e", objectPath], { cwd: repoRoot });
    return true;
  } catch {
    return false;
  }
}

async function findAgentLogForSha(sha) {
  let files;
  try {
    files = await readdir(agentDir);
  } catch {
    return null;
  }
  for (const f of files.filter((x) => x.endsWith(".json")).sort().reverse()) {
    const raw = await readFile(join(agentDir, f), "utf8");
    const doc = JSON.parse(raw);
    if (doc.git?.sha === sha) return join(agentDir, f);
  }
  return null;
}

/** Agent log at HEAD whose git.sha matches, or latest pair committed at HEAD (post-amend sync). */
async function findAgentLogForHead(sha) {
  const exact = await findAgentLogForSha(sha);
  if (exact) return { path: exact, mode: "sha-match" };

  let files;
  try {
    files = await readdir(agentDir);
  } catch {
    return null;
  }

  for (const f of files.filter((x) => x.endsWith(".json")).sort().reverse()) {
    const rel = `work-log/dev-logs/agent/${f}`;
    if (await gitCatFileExists(repoRoot, `${sha}:${rel}`)) {
      return { path: join(agentDir, f), mode: "committed-at-head" };
    }
  }
  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const git = await collectGitSnapshot(repoRoot);

  if (args.check) {
    const found = await findAgentLogForHead(git.sha);
    if (!found) {
      console.error(`No agent dev-log for HEAD (${git.shortSha}). Run: npm run dev-log:pre-push -- --slug <topic>`);
      process.exit(1);
    }
    const label = found.path.replace(repoRoot + "/", "").replace(repoRoot + "\\", "");
    if (found.mode === "sha-match") {
      console.log(`OK: agent dev-log matches HEAD → ${label}`);
    } else {
      console.log(`OK: agent dev-log committed at HEAD (${found.mode}) → ${label}`);
    }
    return;
  }

  if (!args.slug) {
    console.error("Usage: npm run dev-log:pre-push -- --slug <kebab-topic> [--program 005] [--no-tests]");
    process.exit(1);
  }

  const { date, time, folder: stamp } = formatWorkLogTimestamp();
  const entryId = String(args.program).padStart(3, "0");
  const slug = slugify(args.slug);
  const base = `${entryId}_${date}_${time}`;
  const humanFilename = `${base}_dev-log_${slug}.md`;
  const agentFilename = `${base}_dev-log-agent_${slug}.json`;
  const humanPath = join(humanDir, humanFilename);
  const agentPath = join(agentDir, agentFilename);
  const humanRel = `work-log/dev-logs/human/${humanFilename}`;
  const agentRel = `work-log/dev-logs/agent/${agentFilename}`;

  console.log("Building repository tree…");
  const tree = await buildRepoTree(repoRoot);

  console.log("Collecting API inventory…");
  const apis = await collectApiInventory(repoRoot);
  const apisMarkdown = formatApisMarkdown(apis);
  const treeIgnoreList = TREE_IGNORE_DIRS.filter((d) => d !== ".DS_Store").join("`, `");

  console.log(args.noTests ? "Skipping tests." : "Running npm test…");
  const tests = await runTestSuite(repoRoot, { run: !args.noTests });
  const changes = classifyChangedFiles(git.changedFiles);

  const title = args.title || slug.replace(/-/g, " ");
  const apisDetailedMarkdown = apisMarkdown;

  const humanBody = buildHumanDevLog({
    title,
    entryId,
    date,
    time,
    humanFilename,
    agentFilename,
    git,
    tests,
    apis,
    apisDetailedMarkdown,
    tree,
    treeIgnoreList
  });

  const agentDoc = {
    meta: {
      schemaVersion: "1.0.0",
      entryId,
      slug,
      generatedAt: new Date().toISOString(),
      humanLogPath: humanRel,
      audience: "agent",
      filledBy: "script",
      handoffRefs: []
    },
    summary:
      "FILL: One-paragraph audit summary for the next agent. What shipped, current state, blockers.",
    apis,
    git: {
      branch: git.branch,
      sha: git.sha,
      shortSha: git.shortSha,
      changedFiles: git.changedFiles,
      diffStatAgainstHead: git.diffStatAgainstHead,
      diffCachedStat: git.diffCachedStat,
      recentCommits: git.recentCommits
    },
    tests: {
      ran: tests.ran,
      exitCode: tests.exitCode,
      summary: tests.summary,
      passed: tests.passed,
      failed: tests.failed,
      commands: tests.ran ? ["npm test"] : []
    },
    repositoryTree: {
      capturedAt: new Date().toISOString(),
      excludeDirs: TREE_IGNORE_DIRS,
      excludePrefixes: tree.excludePrefixes,
      treeIgnoreFlag: 'tree -I "node_modules|.git|dist|build"',
      stats: tree.stats,
      treeText: tree.treeText,
      flatPathCount: tree.flatPaths.length
    },
    changes: {
      ...changes,
      narrative: ["FILL: bullet list of intentional behavioral / API changes"]
    },
    decisions: [
      {
        id: "D1",
        decision: "FILL",
        rationale: "FILL",
        alternativesRejected: ["FILL"],
        tradeoff: "FILL"
      }
    ],
    iterations: [
      {
        attempt: 1,
        action: "FILL: what was tried",
        outcome: "FILL: pass/fail/deferred",
        blockedBy: ""
      }
    ],
    tradeoffs: ["FILL"],
    improvements: ["FILL"],
    regressions: ["FILL"],
    risks: ["FILL"],
    followUps: ["FILL"]
  };

  await mkdir(humanDir, { recursive: true });
  await mkdir(agentDir, { recursive: true });
  await writeFile(humanPath, humanBody);
  await writeFile(agentPath, JSON.stringify(agentDoc, null, 2));

  console.log("\nPre-push dev logs created:");
  console.log(`  Human: ${humanRel}`);
  console.log(`  Agent: ${agentRel}`);
  console.log(`  Git:   ${git.branch} @ ${git.shortSha}`);
  console.log(`  Tests: ${tests.summary}`);
  console.log("\nNext: fill FILL sections in the agent JSON and narrative sections in the human MD, then add rows to work-log/INDEX.md");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
