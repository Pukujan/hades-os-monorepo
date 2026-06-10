import { readdir, stat } from "fs/promises";
import { join, extname } from "path";

/** Same ignores as `tree -I "node_modules|.git|dist|build"` */
export const TREE_IGNORE_DIRS = ["node_modules", ".git", "dist", "build", ".DS_Store"];
export const TREE_IGNORE_FILES = [".DS_Store"];

/** Runtime / large paths (gitignored or handoff noise) — skip entire subtrees. */
export const TREE_IGNORE_PREFIXES = ["data"];

const EXCLUDE_DIRS = new Set(TREE_IGNORE_DIRS);
const EXCLUDE_FILES = new Set(TREE_IGNORE_FILES);

function normalizeRel(rel) {
  return String(rel || "").replace(/\\/g, "/").replace(/^\.\//, "");
}

function isIgnoredPrefix(relPath, ignorePrefixes) {
  const rel = normalizeRel(relPath);
  if (!rel) return false;
  for (const prefix of ignorePrefixes) {
    const p = normalizeRel(prefix).replace(/\/$/, "");
    if (rel === p || rel.startsWith(`${p}/`)) return true;
  }
  return false;
}

function renderTreeText(nodes, prefix = "") {
  const lines = [];
  for (let i = 0; i < nodes.length; i += 1) {
    const n = nodes[i];
    const last = i === nodes.length - 1;
    const branch = last ? "└── " : "├── ";
    const childPrefix = prefix + (last ? "    " : "│   ");
    const label = n.type === "directory" ? `${n.name}/` : n.name;
    lines.push(`${prefix}${branch}${label}`);
    if (n.type === "directory" && n.children?.length) {
      lines.push(...renderTreeText(n.children, childPrefix));
    }
  }
  return lines;
}

async function walkDir(absDir, relBase = "", ignorePrefixes = []) {
  const entries = await readdir(absDir, { withFileTypes: true });
  const dirs = [];
  const files = [];

  for (const ent of entries) {
    if (ent.isDirectory()) {
      if (EXCLUDE_DIRS.has(ent.name)) continue;
      const rel = relBase ? `${relBase}/${ent.name}` : ent.name;
      if (isIgnoredPrefix(rel, ignorePrefixes)) continue;
      dirs.push(ent.name);
    } else if (ent.isFile()) {
      if (EXCLUDE_FILES.has(ent.name)) continue;
      files.push(ent.name);
    }
  }

  dirs.sort((a, b) => a.localeCompare(b));
  files.sort((a, b) => a.localeCompare(b));

  const children = [];
  const flatPaths = [];

  for (const name of files) {
    const rel = relBase ? `${relBase}/${name}` : name;
    const st = await stat(join(absDir, name));
    flatPaths.push(rel);
    children.push({
      name,
      type: "file",
      path: rel,
      byteLength: st.size,
      modifiedAt: st.mtime.toISOString()
    });
  }

  for (const name of dirs) {
    const rel = relBase ? `${relBase}/${name}` : name;
    const sub = await walkDir(join(absDir, name), rel, ignorePrefixes);
    flatPaths.push(...sub.flatPaths);
    children.push({
      name,
      type: "directory",
      path: rel,
      childCount: sub.childCount,
      children: sub.children
    });
  }

  return { children, flatPaths, childCount: children.length };
}

function countStats(flatPaths, treeChildren) {
  const byExtension = {};
  let fileCount = 0;
  let dirCount = 0;

  function walk(nodes) {
    for (const n of nodes) {
      if (n.type === "file") {
        fileCount += 1;
        const ext = extname(n.name).toLowerCase() || "(no extension)";
        byExtension[ext] = (byExtension[ext] ?? 0) + 1;
      } else {
        dirCount += 1;
        if (n.children) walk(n.children);
      }
    }
  }
  walk(treeChildren);

  return {
    fileCount,
    directoryCount: dirCount,
    pathCount: flatPaths.length,
    byExtension: Object.fromEntries(
      Object.entries(byExtension).sort((a, b) => b[1] - a[1])
    )
  };
}

/**
 * @param {string} repoRoot
 * @param {{ ignorePrefixes?: string[] }} [options]
 * @returns {Promise<{ rootName: string, tree: object, treeText: string, stats: object, flatPaths: string[] }>}
 */
export async function buildRepoTree(repoRoot, options = {}) {
  const ignorePrefixes = options.ignorePrefixes ?? TREE_IGNORE_PREFIXES;
  const rootName = repoRoot.split("/").pop() || "repo";
  const walked = await walkDir(repoRoot, "", ignorePrefixes);
  const stats = countStats(walked.flatPaths, walked.children);
  const treeText = [rootName + "/", ...renderTreeText(walked.children)].join("\n");
  return {
    rootName,
    excludePrefixes: ignorePrefixes,
    tree: {
      name: rootName,
      type: "directory",
      path: "",
      children: walked.children
    },
    treeText,
    stats,
    flatPaths: walked.flatPaths.sort((a, b) => a.localeCompare(b))
  };
}
