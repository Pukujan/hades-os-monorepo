/**
 * Build two-part human dev log: Part I Summary (TOC, mermaid, audit tables) + Part II Detailed.
 */

function anchor(slug) {
  return slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function condensedTree(treeText, maxLines = 48) {
  const lines = treeText.split("\n");
  if (lines.length <= maxLines) return treeText;
  return `${lines.slice(0, maxLines).join("\n")}\n│   └── … (${lines.length - maxLines} more lines — [full tree](#${anchor("repository-tree-full")}))`;
}

function buildMermaidModuleMap(apis) {
  const modules = new Map();
  for (const r of [...apis.http.active, ...apis.http.stub]) {
    const id = r.module.replace(/\s+/g, "");
    if (!modules.has(id)) {
      modules.set(id, r.module);
    }
  }
  const lines = ["flowchart LR", "  client[Client / Frontend]"];
  let i = 0;
  for (const [, label] of modules) {
    const node = `m${i}[${label}]`;
    lines.push(`  client --> ${node}`);
    i += 1;
  }
  return lines.join("\n");
}

function buildMermaidPipeline(apis) {
  const p = apis.versioned?.pipeline;
  if (!p) {
    return `flowchart TB
  seed[Demo seed JSON] --> services[Frontend services]
  services --> workspace[Maria Santos case workspace]`;
  }
  return `flowchart TB
  upload[Upload PDFs] --> parse[Parse cache ${p.parsedArtifacts}]
  parse --> master[Master prompt ${p.masterPrompt}]
  master --> out[Batch outputs]
  rules[Rule fixtures ${p.ruleSet}] -.-> master
  golden[Golden ${p.goldenDataset}] -.-> evals[Eval runner]`;
}

function buildMermaidPrePush() {
  return `flowchart LR
  code[Code changes] --> devlog[npm run dev-log:pre-push]
  devlog --> human[human/*.md]
  devlog --> agent[agent/*.json]
  human --> push[git push]
  agent --> push`;
}

function formatApiSummaryTable(apis) {
  const rows = [
    "| Kind | Count | Notes |",
    "|------|------:|-------|",
    `| Active HTTP routes | ${apis.http.active.length} | Case-filing-ai + condenser + pipeline |`,
    `| Stub modules (health only) | ${apis.http.stub.length} | Workflow, court-rules, vault, review, docketing |`,
    `| Deprecated HTTP | ${apis.http.deprecated.length} | From docs/API.md descriptions |`,
    `| Deprecated CLI | ${apis.deprecated.cli.length} | See version audit |`
  ];
  const key = apis.http.active
    .filter((r) => /process-batch|parsed-documents|condense/.test(r.path))
    .slice(0, 6);
  if (key.length) {
    rows.push("", "**Key routes this program:**", "");
    rows.push("| Method | Path |", "|--------|------|");
    for (const r of key) {
      rows.push(`| ${r.method} | \`${r.path}\` |`);
    }
  }
  return rows.join("\n");
}

function formatVersionAuditTable(apis) {
  const p = apis.versioned?.pipeline;
  if (!p) {
    const appVersion = apis.versioned?.app?.packageJson ?? "—";
    return [
      "| Contract | Version | Status |",
      "|----------|---------|--------|",
      `| App (package.json) | ${appVersion} | current |`,
      "| Demo seed / frontend workspace | Maria Santos Phase 1 | current |",
      "| Batch pipeline contracts | — | not active in this repo phase |"
    ].join("\n");
  }
  const rows = [
    "| Contract | Version | Status |",
    "|----------|---------|--------|",
    `| App (package.json) | ${p.app} | current |`,
    `| Storage layout | ${p.storageLayout} | current |`,
    `| Parsed artifacts | ${p.parsedArtifacts} | current |`,
    `| Master prompt (default) | ${p.masterPrompt} | env \`${apis.versioned.prompts.envVar}\` |`,
    `| Rule prompt | ${p.rulePrompt} | current |`,
    `| Golden dataset | ${p.goldenDataset} | current |`,
    `| Parser | ${p.parser} | current |`,
    `| OCR | ${p.ocr} | current |`
  ];
  rows.push("", "**Master prompt keys:**", "");
  rows.push("| Key | Template | Notes |", "|-----|----------|-------|");
  if (apis.versioned?.prompts?.specs) {
    for (const [key, spec] of Object.entries(apis.versioned.prompts.specs)) {
      const status = key === "v2" ? "alias → compact" : key === "v001" ? "opt-in" : key === apis.versioned.prompts.defaultEnv ? "default" : "available";
      rows.push(`| ${key} | \`${spec.masterCaseFiling}\` | ${status} |`);
    }
  }
  if (apis.deprecated.cli.length) {
    rows.push("", "**Deprecated surfaces:**", "");
    for (const d of apis.deprecated.cli) {
      rows.push(`- \`${d.command}\` → ${d.replacement}`);
    }
  }
  return rows.join("\n");
}

function formatTestAuditTable(tests) {
  if (!tests.ran) {
    return "| Status | Value |\n|--------|-------|\n| Tests | _not run_ (`--no-tests` or fill after run) |";
  }
  return [
    "| Status | Value |",
    "|--------|-------|",
    `| Ran | yes |`,
    `| Exit code | ${tests.exitCode} |`,
    `| Summary | ${tests.summary} |`,
    `| Passed (sample) | ${tests.passed.length} lines captured |`,
    `| Failed (sample) | ${tests.failed.length} lines captured |`
  ].join("\n");
}

function formatGitAuditTable(git) {
  const changed = git.changedFiles?.length ?? 0;
  return [
    "| Field | Value |",
    "|-------|-------|",
    `| Branch | \`${git.branch}\` |`,
    `| Commit | \`${git.shortSha}\` (\`${git.sha}\`) |`,
    `| Changed paths (porcelain) | ${changed} |`,
    `| Recent commits | ${git.recentCommits?.length ?? 0} listed below |`
  ].join("\n");
}

function formatRepoShapeTable(tree) {
  return [
    "| Metric | Value |",
    "|--------|------:|",
    `| Files | ${tree.stats.fileCount} |`,
    `| Directories | ${tree.stats.directoryCount} |`,
    `| Tree ignores | node_modules, .git, dist, build |`,
    `| Top extensions | ${Object.entries(tree.stats.byExtension || {})
      .slice(0, 5)
      .map(([k, v]) => `${k} (${v})`)
      .join(", ")} |`
  ].join("\n");
}

/**
 * @param {object} opts
 */
export function buildHumanDevLog(opts) {
  const {
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
  } = opts;

  const p1 = "part-i-summary";
  const p2 = "part-ii-detailed";

  const toc = [
    "## Table of contents",
    "",
    "### [Part I — Summary](#" + anchor(p1) + ") _(read first)_",
    "- [I.1 At a glance](#" + anchor("i1-at-a-glance") + ")",
    "- [I.2 Diagrams](#" + anchor("i2-diagrams") + ")",
    "- [I.3 API surface (summary)](#" + anchor("i3-api-surface-summary") + ")",
    "- [I.4 Version & prompt audit](#" + anchor("i4-version-prompt-audit") + ")",
    "- [I.5 Test audit](#" + anchor("i5-test-audit") + ")",
    "- [I.6 Git audit](#" + anchor("i6-git-audit") + ")",
    "- [I.7 Repository shape](#" + anchor("i7-repository-shape") + ")",
    "",
    "### [Part II — Detailed](#" + anchor(p2) + ") _(full audit trail)_",
    "- [II.1 Goals and scope](#" + anchor("ii1-goals-and-scope") + ")",
    "- [II.2 Decisions](#" + anchor("ii2-decisions") + ")",
    "- [II.3 Changes by area](#" + anchor("ii3-changes-by-area") + ")",
    "- [II.4 Iterations](#" + anchor("ii4-iterations") + ")",
    "- [II.5 Tests (detail)](#" + anchor("ii5-tests-detail") + ")",
    "- [II.6 What got better / trade-offs / risks](#" + anchor("ii6-outcomes") + ")",
    "- [II.7 Follow-ups](#" + anchor("ii7-follow-ups") + ")",
    "- [II.8 APIs (full registry)](#" + anchor("ii8-apis-full-registry") + ")",
    "- [II.9 Git snapshot (full)](#" + anchor("ii9-git-snapshot-full") + ")",
    "- [II.10 Repository tree (full)](#" + anchor("repository-tree-full") + ")"
  ].join("\n");

  const summary = [
    `# Dev log (human): ${title}`,
    "",
    "| Field | Value |",
    "|-------|--------|",
    `| **Entry** | ${entryId} |`,
    `| **Date** | ${date} |`,
    `| **Time** | ${time} |`,
    `| **Filename** | \`${humanFilename}\` |`,
    `| **Agent audit** | [${agentFilename}](../agent/${agentFilename}) |`,
    `| **Git** | \`${git.branch}\` @ \`${git.shortSha}\` |`,
    "",
    toc,
    "",
    "---",
    "",
    `## Part I — Summary {#${anchor(p1)}}`,
    "",
    `> **Purpose:** One-screen picture for reviewers — APIs, versions, tests, git, repo shape.  `,
    `> **Detail:** [Part II](#${anchor(p2)}) below.`,
    "",
    `### I.1 At a glance {#${anchor("i1-at-a-glance")}}`,
    "",
    "_FILL: 2–4 sentences — what shipped, why it matters, current blockers._",
    "",
    `### I.2 Diagrams {#${anchor("i2-diagrams")}}`,
    "",
    "**HTTP modules (active + stub)**",
    "",
    "```mermaid",
    buildMermaidModuleMap(apis),
    "```",
    "",
    "**Pipeline versions (defaults at push)**",
    "",
    "```mermaid",
    buildMermaidPipeline(apis),
    "```",
    "",
    "**Pre-push dev log flow**",
    "",
    "```mermaid",
    buildMermaidPrePush(),
    "```",
    "",
    `### I.3 API surface (summary) {#${anchor("i3-api-surface-summary")}}`,
    "",
    formatApiSummaryTable(apis),
    "",
    `_Session API changes not in docs/API.md — FILL in [II.8](#${anchor("ii8-apis-full-registry")})._`,
    "",
    `### I.4 Version & prompt audit {#${anchor("i4-version-prompt-audit")}}`,
    "",
    formatVersionAuditTable(apis),
    "",
    `### I.5 Test audit {#${anchor("i5-test-audit")}}`,
    "",
    formatTestAuditTable(tests),
    "",
    `### I.6 Git audit {#${anchor("i6-git-audit")}}`,
    "",
    formatGitAuditTable(git),
    "",
    `### I.7 Repository shape {#${anchor("i7-repository-shape")}}`,
    "",
    formatRepoShapeTable(tree),
    "",
    "_Condensed tree (full tree in [II.10](#repository-tree-full)):_",
    "",
    "```text",
    condensedTree(tree.treeText),
    "```",
    "",
    "---",
    "",
    `## Part II — Detailed {#${anchor(p2)}}`,
    "",
    `> **Purpose:** Decisions, iterations, narrative, and full machine-captured snapshots.`,
    "",
    `### II.1 Goals and scope {#${anchor("ii1-goals-and-scope")}}`,
    "",
    "- **In scope:** _FILL_",
    "- **Out of scope:** _FILL_",
    "",
    `### II.2 Decisions {#${anchor("ii2-decisions")}}`,
    "",
    "| ID | Decision | Rationale | Alternatives rejected |",
    "|----|----------|-----------|------------------------|",
    "| D1 | _FILL_ | _FILL_ | _FILL_ |",
    "",
    `### II.3 Changes by area {#${anchor("ii3-changes-by-area")}}`,
    "",
    "#### Backend / API",
    "- _FILL_",
    "",
    "#### Frontend",
    "- _FILL_",
    "",
    "#### Data / contracts / prompts",
    "- _FILL_",
    "",
    "#### Tooling / CI / docs",
    "- _FILL_",
    "",
    `### II.4 Iterations {#${anchor("ii4-iterations")}}`,
    "",
    "1. **Attempt 1** — _FILL_ → _outcome_",
    "",
    `### II.5 Tests (detail) {#${anchor("ii5-tests-detail")}}`,
    "",
    "#### Passed",
    "- _FILL_",
    "",
    "#### Failed",
    "- _FILL or none_",
    "",
    tests.ran && tests.rawTail
      ? `#### Raw tail (auto)\n\n\`\`\`\n${tests.rawTail.slice(-2000)}\n\`\`\``
      : "",
    "",
    `### II.6 What got better / trade-offs / risks {#${anchor("ii6-outcomes")}}`,
    "",
    "**Better**",
    "- _FILL_",
    "",
    "**Trade-offs**",
    "- _FILL_",
    "",
    "**Regressions / risks**",
    "- _FILL_",
    "",
    `### II.7 Follow-ups {#${anchor("ii7-follow-ups")}}`,
    "",
    "- [ ] _FILL_",
    "",
    `### II.8 APIs (full registry) {#${anchor("ii8-apis-full-registry")}}`,
    "",
    apisDetailedMarkdown,
    "",
    `### II.9 Git snapshot (full) {#${anchor("ii9-git-snapshot-full")}}`,
    "",
    "**Changed files (porcelain)**",
    "",
    "```",
    git.statusPorcelain || "(clean)",
    "```",
    "",
    "**Diff stat vs HEAD**",
    "",
    "```",
    git.diffStatAgainstHead || "(no diff)",
    "```",
    "",
    "**Recent commits**",
    "",
    "```",
    (git.recentCommits || []).join("\n"),
    "```",
    "",
    `### II.10 Repository tree (full) {#${anchor("repository-tree-full")}}`,
    "",
    `_Ignores: \`${treeIgnoreList}\` — equivalent to \`tree -I "node_modules|.git|dist|build"\`._`,
    "",
    "```text",
    tree.treeText,
    "```"
  ];

  return summary.join("\n");
}
