#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
let exitCode = 0;
const errors = [];

function resolve(rel) {
  return path.join(root, rel);
}

function exists(rel) {
  return fs.existsSync(resolve(rel));
}

function readFile(rel) {
  return fs.readFileSync(resolve(rel), "utf8");
}

function readJson(rel) {
  return JSON.parse(readFile(rel));
}

function check(predicate, msg) {
  if (!predicate) {
    errors.push(msg);
    exitCode = 1;
  }
}

const adrDir = "docs/architecture/adr";
check(exists(adrDir), `ADR directory ${adrDir} must exist`);

const readmePath = path.join(adrDir, "README.md");
check(exists(readmePath), "ADR README.md must exist");
if (exists(readmePath)) {
  const readme = readFile(readmePath);
  const requiredStatuses = ["Accepted", "Proposed", "Deprecated", "Superseded"];
  for (const status of requiredStatuses) {
    check(readme.includes(status), `ADR README must mention status "${status}"`);
  }
}

const indexPath = path.join(adrDir, "INDEX.md");
check(exists(indexPath), "ADR INDEX.md must exist");

const adrIds = [
  "ADR-0001", "ADR-0002", "ADR-0003", "ADR-0004",
  "ADR-0005", "ADR-0006", "ADR-0007", "ADR-0008",
];
const validStatuses = ["Accepted", "Proposed", "Deprecated", "Superseded"];

let adrFiles;
try {
  adrFiles = fs.readdirSync(resolve(adrDir))
    .filter(f => f.endsWith(".md") && f !== "README.md" && f !== "INDEX.md");
} catch {
  adrFiles = [];
}

for (const id of adrIds) {
  const num = id.replace("ADR-", "");
  const matchingFile = adrFiles.find(f => f.startsWith(`${num}-`));
  check(matchingFile !== undefined, `ADR file for ${id} (${num}-*.md) must exist in ${adrDir}`);
  if (matchingFile) {
    const content = readFile(path.join(adrDir, matchingFile));
    check(content.includes(`# ${id}`), `${matchingFile} must have "# ${id}" heading`);
    check(content.includes("## Status"), `${matchingFile} must have "## Status" section`);
    check(content.includes("## Context"), `${matchingFile} must have "## Context" section`);
    check(content.includes("## Decision"), `${matchingFile} must have "## Decision" section`);
    check(content.includes("## Consequences"), `${matchingFile} must have "## Consequences" section`);
    check(content.includes("## Links"), `${matchingFile} must have "## Links" section`);

    const statusMatch = content.match(/^## Status\s*\n\s*(.+)/m);
    if (statusMatch) {
      const status = statusMatch[1].trim();
      check(validStatuses.includes(status), `${matchingFile} has invalid status "${status}". Must be one of: ${validStatuses.join(", ")}`);
    } else {
      errors.push(`${matchingFile} could not parse status after "## Status" heading`);
      exitCode = 1;
    }
  }
}

check(exists("metadata/adrs.json"), "metadata/adrs.json must exist");
if (exists("metadata/adrs.json")) {
  let adrsMeta;
  try {
    adrsMeta = readJson("metadata/adrs.json");
  } catch {
    check(false, "metadata/adrs.json is not valid JSON");
    process.exit(1);
  }

  check(
    Array.isArray(adrsMeta.adrs),
    "metadata/adrs.json must have an adrs array"
  );

  for (const id of adrIds) {
    const entry = (adrsMeta.adrs ?? []).find((a) => a.id === id);
    check(entry !== undefined, `metadata/adrs.json must contain entry for ${id}`);
    if (entry) {
      check(typeof entry.title === "string" && entry.title.length > 0, `${id} in metadata/adrs.json must have a non-empty title`);
      check(validStatuses.includes(entry.status), `${id} in metadata/adrs.json has invalid status "${entry.status}"`);
      check(typeof entry.path === "string" && entry.path.length > 0, `${id} in metadata/adrs.json must have a non-empty path`);
      check(typeof entry.phase === "string" && entry.phase.length > 0, `${id} in metadata/adrs.json must have a non-empty phase`);
    }
  }
}

for (const err of errors) {
  console.error(err);
}
process.exit(exitCode);
