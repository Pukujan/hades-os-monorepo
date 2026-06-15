import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Group B — Hermes Binary Resolution
 *
 * Rule: HERMES_BIN_PATH env (highest priority) > system PATH > dev fallback (dev only)
 */

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "hades-hermes-bin-"));
}

describe("resolveHermesBin", () => {
  test("uses HERMES_BIN_PATH env var when set and exists (highest priority)", async () => {
    const tmpDir = makeTempDir();
    const fakeBin = path.join(tmpDir, "hermes");
    fs.writeFileSync(fakeBin, "", { mode: 0o755 });
    process.env.HERMES_BIN_PATH = fakeBin;
    try {
      const mod = await import("../../services/hermesRuntime.service.js");

      const calls = [];
      const runtime = mod.createHermesRuntimeService({
        hermesBin: undefined,
        runCommand: async (bin, args, options) => {
          calls.push(bin);
          return '{"assistantText":"ok"}';
        },
      });
      await runtime.generateDraft({ message: "test", currentDraft: { status: "incomplete" } });
      assert.equal(calls[0], fakeBin);
    } finally {
      delete process.env.HERMES_BIN_PATH;
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe("binary resolution order", () => {
  let NODE_ENV_ORIG;

  before(() => {
    NODE_ENV_ORIG = process.env.NODE_ENV;
  });

  after(() => {
    process.env.NODE_ENV = NODE_ENV_ORIG;
  });

  test("uses explicit hermesBin over resolveHermesBin", async () => {
    process.env.NODE_ENV = "production";
    const mod = await import("../../services/hermesRuntime.service.js");

    const calls = [];
    const runtime = mod.createHermesRuntimeService({
      hermesBin: "hermes",
      runCommand: async (bin, args, options) => {
        calls.push(bin);
        return '{"assistantText":"ok"}';
      },
    });
    await runtime.generateDraft({ message: "test", currentDraft: { status: "incomplete" } });
    assert.equal(calls[0], "hermes");
  });
});
