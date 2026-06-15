import { test } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const IMAGE = "backend-startup-test";
const ENTRY_POINT = "src/core/server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cwd = path.resolve(__dirname, "../../../..");

function dockerAvailable() {
  try {
    execSync("docker info", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

test("Docker image builds with correct build context", { timeout: 300_000 }, (t) => {
  if (!dockerAvailable()) { t.skip("Docker daemon not running"); return; }
  execSync(`docker build -t ${IMAGE} -f backend/Dockerfile .`, { cwd, stdio: "pipe" });
});

test("server.js exists at entry point in built image", { timeout: 30_000 }, (t) => {
  if (!dockerAvailable()) { t.skip("Docker daemon not running"); return; }
  const out = execSync(
    `docker run --rm ${IMAGE} ls /app/${ENTRY_POINT}`,
    { encoding: "utf8", cwd }
  );
  assert.ok(out.includes("server.js"), `${ENTRY_POINT} must exist in Docker image`);
});

test("server.js has no syntax errors", { timeout: 30_000 }, (t) => {
  if (!dockerAvailable()) { t.skip("Docker daemon not running"); return; }
  const out = execSync(
    `docker run --rm ${IMAGE} node --check /app/${ENTRY_POINT} && echo SYNTAX_OK`,
    { encoding: "utf8", cwd }
  );
  assert.match(out, /SYNTAX_OK/, `server.js must have valid syntax`);
});
