import { readFileSync, existsSync } from "fs";
import { join } from "path";

function readText(path) {
  return readFileSync(path, "utf8");
}

function parseRegistryRows(masterText) {
  const start = masterText.indexOf("## Endpoint registry");
  if (start < 0) return [];
  const section = masterText.slice(start);
  const end = section.indexOf("\n## ", 4);
  const body = end >= 0 ? section.slice(0, end) : section;
  const rows = [];
  for (const line of body.split("\n")) {
    if (!line.startsWith("|") || line.includes("---") || line.toLowerCase().includes("method")) {
      continue;
    }
    const cols = line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cols.length >= 4) {
      rows.push({
        method: cols[0].toUpperCase(),
        path: cols[1].replace(/^`/, "").replace(/`$/, ""),
        module: cols[2],
        description: cols[3]
      });
    }
  }
  return rows;
}

function parseModuleIndex(masterText) {
  const start = masterText.indexOf("## Module index");
  if (start < 0) return [];
  const section = masterText.slice(start);
  const end = section.indexOf("\n## ", 4);
  const body = end >= 0 ? section.slice(0, end) : section;
  const rows = [];
  for (const line of body.split("\n")) {
    if (!line.startsWith("|") || line.includes("---") || line.toLowerCase().includes("module")) {
      continue;
    }
    const cols = line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cols.length >= 3) {
      rows.push({
        module: cols[0],
        basePath: cols[1].replace(/^`/, "").replace(/`$/, ""),
        status: cols[3] || cols[2]
      });
    }
  }
  return rows;
}

function classifyRoute(row) {
  const desc = row.description.toLowerCase();
  if (desc.includes("deprecated")) return "deprecated";
  if (desc.includes("stub") || desc.includes("health only")) return "stub";
  return "active";
}

export async function collectApiInventory(repoRoot) {
  const masterApiPath = join(repoRoot, "docs/API.md");
  const masterText = existsSync(masterApiPath) ? readText(masterApiPath) : "";
  const registry = parseRegistryRows(masterText);
  const moduleIndex = parseModuleIndex(masterText);

  const http = { active: [], stub: [], deprecated: [] };
  for (const row of registry) {
    http[classifyRoute(row)].push({
      method: row.method,
      path: row.path,
      module: row.module,
      description: row.description
    });
  }

  const cli = [
    { command: "npm run dev-log:pre-push", purpose: "Paired human + agent dev logs" },
    {
      command: "npm run condense:all",
      purpose: "consolidated snapshots → file-exchange/exports/{stamp}_consolidated/"
    },
    { command: "npm run import:file-exchange", purpose: "Inbound bundle → file-exchange/imports/{stamp}/" },
    { command: "npm --prefix backend run condense-models", purpose: "Regenerate consolidated-models.json" }
  ];

  return {
    capturedAt: new Date().toISOString(),
    sourceDocs: ["docs/API.md"],
    http,
    moduleStatus: moduleIndex.map((m) => ({
      module: m.module,
      basePath: m.basePath,
      status: m.status
    })),
    versioned: {
      pipeline: null,
      prompts: null,
      storage: null,
      app: {
        packageJson: readText(join(repoRoot, "package.json")).match(/"version":\s*"([^"]+)"/)?.[1]
      }
    },
    deprecated: { http: http.deprecated, cli: [], prompts: [], notes: [] },
    cli
  };
}

export function formatApisMarkdown(apis) {
  const lines = [
    "### HTTP — active",
    "",
    "| Method | Path | Module | Description |",
    "|--------|------|--------|-------------|"
  ];
  for (const r of apis.http.active) {
    lines.push(`| ${r.method} | \`${r.path}\` | ${r.module} | ${r.description} |`);
  }
  lines.push("", "### HTTP — stub (health only)", "");
  if (apis.http.stub.length) {
    lines.push("| Method | Path | Module | Description |", "|--------|------|--------|-------------|");
    for (const r of apis.http.stub) {
      lines.push(`| ${r.method} | \`${r.path}\` | ${r.module} | ${r.description} |`);
    }
  } else {
    lines.push("_none_");
  }
  lines.push("", "### HTTP — deprecated", "", "_none registered in docs/API.md_");
  return lines.join("\n");
}
