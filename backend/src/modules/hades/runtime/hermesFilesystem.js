import fs from "node:fs";
import path from "node:path";

export function createHermesFilesystem({ homeDir } = {}) {
  async function writeFile(filePath, content) {
    const resolvedHome = path.resolve(homeDir);
    const resolved = path.isAbsolute(filePath)
      ? path.resolve(filePath)
      : path.resolve(homeDir, filePath);
    if (!resolved.startsWith(resolvedHome)) {
      throw new Error("File path outside workspace: traversal detected");
    }
    await fs.promises.mkdir(path.dirname(resolved), { recursive: true });
    await fs.promises.writeFile(resolved, content, "utf8");
  }

  async function readTree({ root } = {}) {
    const resolvedRoot = path.resolve(root || homeDir);
    const results = [];
    async function walk(dir) {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === "." || entry.name === "..") continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          const relativePath = path.relative(resolvedRoot, fullPath).replace(/\\/g, "/");
          let content;
          try { content = await fs.promises.readFile(fullPath, "utf8"); }
          catch { content = ""; }
          results.push({ root: resolvedRoot, relativePath, content });
        }
      }
    }
    await walk(resolvedRoot);
    return results;
  }

  async function writeTree({ root, entries } = {}) {
    const resolvedRoot = path.resolve(root || homeDir);
    for (const entry of entries || []) {
      const resolved = path.join(resolvedRoot, entry.relativePath);
      if (!resolved.startsWith(resolvedRoot)) continue;
      await fs.promises.mkdir(path.dirname(resolved), { recursive: true });
      await fs.promises.writeFile(resolved, entry.content, "utf8");
    }
  }

  async function readChangedFiles() {
    const results = [];
    async function walk(dir) {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith(".")) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          const stat = await fs.promises.stat(fullPath);
          const relativePath = path.relative(homeDir, fullPath).replace(/\\/g, "/");
          const content = await fs.promises.readFile(fullPath, "utf8");
          results.push({ relativePath, content, mtimeMs: stat.mtimeMs });
        }
      }
    }
    await walk(homeDir);
    return results;
  }

  return { writeFile, readChangedFiles, readTree, writeTree };
}
