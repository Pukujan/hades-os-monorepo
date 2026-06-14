import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SOULS_DIR = path.dirname(fileURLToPath(import.meta.url));

export function loadSoul(name) {
  const filePath = path.join(SOULS_DIR, `${name}.soul.md`);
  return fs.readFileSync(filePath, "utf8");
}
