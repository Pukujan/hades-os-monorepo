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

  return { writeFile, readChangedFiles };
}
