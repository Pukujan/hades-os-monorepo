import { test } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { resolveHermesBin } from "../../services/hermesRuntime.service.js";

const IMAGE = "hades-backend-test";
const HERMES_PATH = "/opt/hermes-venv/bin/hermes";

function dockerAvailable() {
  try {
    execSync("docker info", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cwd = path.resolve(__dirname, "../../../../../../");

test("Docker image builds from backend/Dockerfile", { timeout: 300_000 }, (t) => {
  if (!dockerAvailable()) { t.skip("Docker daemon not running"); return; }
  execSync(`docker build -t ${IMAGE} -f backend/Dockerfile .`, { cwd, stdio: "pipe" });
});

test("hermes binary exists at /opt/hermes-venv/bin/hermes in Docker image", { timeout: 30_000 }, (t) => {
  if (!dockerAvailable()) { t.skip("Docker daemon not running"); return; }
  const out = execSync(
    `docker run --rm ${IMAGE} test -f ${HERMES_PATH} && echo EXISTS`,
    { encoding: "utf8", cwd }
  );
  assert.match(out, /EXISTS/, `${HERMES_PATH} must exist in Docker image`);
});

test("hermes --version succeeds in Docker image", { timeout: 30_000 }, (t) => {
  if (!dockerAvailable()) { t.skip("Docker daemon not running"); return; }
  const out = execSync(
    `docker run --rm ${IMAGE} ${HERMES_PATH} --version`,
    { encoding: "utf8", cwd }
  );
  assert.ok(out.trim().length > 0, "hermes --version must produce output");
});

test("resolveHermesBin finds hermes at Docker path inside container", { timeout: 30_000 }, (t) => {
  if (!dockerAvailable()) { t.skip("Docker daemon not running"); return; }
  const script = "import { resolveHermesBin } from '/app/src/modules/hades/services/hermesRuntime.service.js'; const bin = resolveHermesBin(); console.log('RESOLVED=' + bin);";
  const out = execSync(
    `docker run --rm -e HERMES_BIN_PATH=${HERMES_PATH} ${IMAGE} node --input-type=module -e "${script}"`,
    { encoding: "utf8", cwd }
  );
  assert.match(out, /RESOLVED=/, "resolveHermesBin must resolve to a path");
  assert.ok(
    out.includes("RESOLVED=" + HERMES_PATH) || out.includes("RESOLVED=/app"),
    `resolveHermesBin must resolve to ${HERMES_PATH} or a fallback`
  );
});
