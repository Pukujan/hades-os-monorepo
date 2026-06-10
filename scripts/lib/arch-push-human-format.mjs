/**
 * Human markdown for architecture push logs (export → create-modular-monolith).
 */

const MD_FENCE = "```";

export function buildArchPushHumanLog({
  title,
  entryId,
  date,
  time,
  humanReadableUtc,
  folderStamp,
  humanFilename,
  agentFilename,
  git,
  architecturePush,
  exportLint,
  starterChanges
}) {
  const templateList =
    starterChanges.paths.length > 0
      ? starterChanges.paths.map((p) => `- \`${p}\``).join("\n")
      : "- _(none in git diff — fill if export-only)_";

  const lintRows = [
    "| Gate | Ran | Exit |",
    "|------|-----|-----:|",
    `| lint:contracts | ${exportLint.lintContracts.ran} | ${exportLint.lintContracts.exitCode ?? "—"} |`,
    `| lint:repo-artifacts | ${exportLint.lintRepoArtifacts.ran} | ${exportLint.lintRepoArtifacts.exitCode ?? "—"} |`
  ].join("\n");

  return `# Architecture push log (human): ${title}

| Field | Value |
|-------|--------|
| **Entry** | ${entryId} |
| **When (UTC)** | ${humanReadableUtc} |
| **Folder stamp** | \`${folderStamp}\` |
| **Filename date / time** | ${date} · ${time.replace(/-/g, ":")} UTC |
| **Human log** | \`${humanFilename}\` |
| **Agent audit** | \`${agentFilename}\` |
| **Product git** | \`${git.branch}\` @ \`${git.shortSha}\` |

## Table of contents

- [I. Export summary](#i-export-summary)
- [II. Starter / contract changes](#ii-starter--contract-changes)
- [III. Architecture gates](#iii-architecture-gates)
- [IV. Narrative (fill)](#iv-narrative-fill)
- [V. Git snapshot](#v-git-snapshot)

---

## I. Export summary {#i-export-summary}

| Item | Value |
|------|--------|
| Product repo | \`${architecturePush.productRepo}\` |
| Target repo | [create-modular-monolith](${architecturePush.targetRepo}) |
| npm package | \`${architecturePush.npmPackage}\` |
| npm version (this push) | ${architecturePush.npmVersion ?? "_FILL_"} |
| Export script | \`${architecturePush.exportScript}\` |
| Export target | ${architecturePush.exportTarget ? `\`${architecturePush.exportTarget}\`` : "_local default or FILL_"} |
| Publish | \`${architecturePush.publishCommand}\` |

${MD_FENCE}mermaid
flowchart LR
  product[legal-prmpt-eng templates] --> export[npm run export:architecture-starter]
  export --> template[create-modular-monolith/template]
  template --> archlog[npm run arch-log:push]
  archlog --> human[architecture-push-logs/human]
  archlog --> agent[architecture-push-logs/agent]
  human --> gh[git push create-modular-monolith]
  agent --> gh
  gh --> npm[npm publish]
${MD_FENCE}

---

## II. Starter / contract changes {#ii-starter--contract-changes}

**Templates / export paths touched (git):**

${templateList}

---

## III. Architecture gates {#iii-architecture-gates}

${lintRows}

---

## IV. Narrative (fill) {#iv-narrative-fill}

### What changed in the platform layer

_FILL: bullets — planning gate, dev-log, file-exchange, new contract, etc._

### Why separate from product dev-log

_FILL: one short paragraph._

### Risks / rollback

_FILL_

### Follow-ups

- [ ] _FILL_

---

## V. Git snapshot {#v-git-snapshot}

**Recent commits**

${MD_FENCE}
${(git.recentCommits || []).join("\n") || "(no git)"}
${MD_FENCE}

**Diff stat (working tree vs HEAD)**

${MD_FENCE}
${git.diffStatAgainstHead || "(clean)"}
${MD_FENCE}

**Changed files (porcelain)**

| Code | Path |
|------|------|
${(git.changedFiles || [])
  .map(({ code, path }) => `| ${code} | \`${path}\` |`)
  .join("\n") || "| — | _(none)_ |"}
`;
}
