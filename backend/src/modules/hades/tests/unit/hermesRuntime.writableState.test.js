import { test, describe } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";

/**
 * Group C — Hermes Writable State Isolation
 *
 * Rule: HERMES_HOME env honored; HERMES_CACHE_DIR env honored; defaults are
 * safe temp paths in production, not ~/.hermes.
 */

describe("HERMES_HOME env var", () => {
  test("is passed through to Hermes CLI subprocess", async () => {
    process.env.HERMES_HOME = "/tmp/hermes-home";
    try {
      const mod = await import("../../services/hermesRuntime.service.js");
      let subprocessEnv = null;
      const runtime = mod.createHermesRuntimeService({
        hermesBin: "/fake/hermes",
        runCommand: async (bin, args, options) => {
          subprocessEnv = options.env;
          return '{"assistantText":"ok"}';
        },
      });
      await runtime.generateDraft({ message: "test", currentDraft: { status: "incomplete" } });
      assert.equal(subprocessEnv.HERMES_HOME, "/tmp/hermes-home");
    } finally {
      delete process.env.HERMES_HOME;
    }
  });
});

describe("HERMES_CACHE_DIR env var", () => {
  test("is passed through to Hermes CLI subprocess", async () => {
    process.env.HERMES_CACHE_DIR = "/tmp/hermes-cache";
    try {
      const mod = await import("../../services/hermesRuntime.service.js");
      let subprocessEnv = null;
      const runtime = mod.createHermesRuntimeService({
        hermesBin: "/fake/hermes",
        runCommand: async (bin, args, options) => {
          subprocessEnv = options.env;
          return '{"assistantText":"ok"}';
        },
      });
      await runtime.generateDraft({ message: "test", currentDraft: { status: "incomplete" } });
      assert.equal(subprocessEnv.HERMES_CACHE_DIR, "/tmp/hermes-cache");
    } finally {
      delete process.env.HERMES_CACHE_DIR;
    }
  });
});

describe("default writable state in production", () => {
  test("subprocess env does NOT include HERMES_HOME pointing to ~/.hermes by default", async () => {
    const mod = await import("../../services/hermesRuntime.service.js");
    let subprocessEnv = null;
    const runtime = mod.createHermesRuntimeService({
      hermesBin: "/fake/hermes",
      runCommand: async (bin, args, options) => {
        subprocessEnv = options.env;
        return '{"assistantText":"ok"}';
      },
    });
    await runtime.generateDraft({ message: "test", currentDraft: { status: "incomplete" } });
    const hermesHome = subprocessEnv.HERMES_HOME;
    if (hermesHome) {
      assert.ok(!hermesHome.includes(os.homedir()), "HERMES_HOME should not default to ~/.hermes");
    }
  });
});
