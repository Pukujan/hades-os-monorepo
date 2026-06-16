import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHermesRuntimeService, resolveHermesBin } from "../../services/hermesRuntime.service.js";
import { createEmptyDraft } from "../../data.js";

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "hades-hermes-runtime-"));
}

function withEnvVar(name, value, fn) {
  const prev = process.env[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
  try { return fn(); }
  finally {
    if (prev === undefined) delete process.env[name];
    else process.env[name] = prev;
  }
}

test("resolveHermesBin returns HERMES_BIN_PATH when set to existing binary", () => {
  const tempDir = makeTempDir();
  const fakePath = path.join(tempDir, "hermes");
  fs.writeFileSync(fakePath, "#!/bin/sh\necho fake", { mode: 0o755 });
  const result = withEnvVar("HERMES_BIN_PATH", fakePath, resolveHermesBin);
  assert.equal(result, fakePath);
});

test("resolveHermesBin falls back to 'hermes' when nothing is found", (t) => {
  t.mock.method(fs, "existsSync", () => false);
  const result = withEnvVar("HERMES_BIN_PATH", undefined, resolveHermesBin);
  assert.equal(result, "hermes");
});

test("Hermes runtime wrapper builds a oneshot OpenRouter command with backend env", async () => {
  const tempDir = makeTempDir();
  const backendEnvPath = path.join(tempDir, ".env");
  fs.writeFileSync(
    backendEnvPath,
    [
      "OPENROUTER_API_KEY=backend-secret",
      "HERMES_PROVIDER=openrouter",
      "HERMES_MODEL=deepseek/deepseek-v4-flash",
      "HERMES_CONTEXT_LENGTH=30720"
    ].join("\n"),
    "utf8"
  );

  const calls = [];
  const runtime = createHermesRuntimeService({
    hermesBin: "/fake/hermes",
    backendEnvPath,
    runCommand: async (bin, args, options) => {
      calls.push({ bin, args, options });
      return JSON.stringify({
        assistantText: "Draft updated.",
        draftPatch: { name: "Cat Meme Minion", category: "fun", targetSocial: "discord", triggerType: "command" },
        missingFields: ["commandName"],
        suggestions: ["!catmeme"]
      });
    }
  });

  const result = await runtime.generateDraft({
    userId: "local-user",
    conversationId: "conv-1",
    message: "Make a Discord cat meme command",
    currentDraft: createEmptyDraft()
  });

  assert.equal(result.source, "hermes_runtime");
  assert.equal(result.assistantText, "Draft updated.");
  assert.equal(result.draftPatch.name, "Cat Meme Minion");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].bin, "/fake/hermes");
  assert.ok(calls[0].args.includes("--oneshot"));
  assert.ok(calls[0].args.includes("--provider"));
  assert.ok(calls[0].args.includes("openrouter"));
  assert.ok(calls[0].args.includes("--model"));
  assert.ok(calls[0].args.includes("deepseek/deepseek-v4-flash"));
  assert.equal(calls[0].options.env.OPENROUTER_API_KEY, "backend-secret");
  assert.ok(typeof calls[0].options.timeout === "number", "options.timeout should be a number");
});

test("Hermes runtime passes timeout option from HERMES_TIMEOUT env var", async () => {
  const tempDir = makeTempDir();
  const backendEnvPath = path.join(tempDir, ".env");
  fs.writeFileSync(
    backendEnvPath,
    ["HERMES_PROVIDER=openrouter", "HERMES_MODEL=model", "HERMES_TIMEOUT=25000"].join("\n"),
    "utf8"
  );

  const calls = [];
  const runtime = createHermesRuntimeService({
    hermesBin: "/fake/hermes",
    backendEnvPath,
    runCommand: async (bin, args, options) => {
      calls.push({ bin, args, options });
      return JSON.stringify({ assistantText: "ok" });
    }
  });

  await runtime.generateDraft({
    message: "test",
    currentDraft: createEmptyDraft()
  });

  assert.equal(calls[0].options.timeout, 25000);
});

test("Hermes runtime uses default timeout when HERMES_TIMEOUT is not set", async () => {
  const tempDir = makeTempDir();
  const backendEnvPath = path.join(tempDir, ".env");
  fs.writeFileSync(backendEnvPath, "HERMES_PROVIDER=openrouter\nHERMES_MODEL=model\n", "utf8");

  const calls = [];
  const runtime = createHermesRuntimeService({
    hermesBin: "/fake/hermes",
    backendEnvPath,
    runCommand: async (bin, args, options) => {
      calls.push({ bin, args, options });
      return JSON.stringify({ assistantText: "ok" });
    }
  });

  await runtime.generateDraft({
    message: "test",
    currentDraft: createEmptyDraft()
  });

  assert.equal(calls[0].options.timeout, 120000);
});

test("Hermes runtime wraps timeout/exec errors with stderr", async () => {
  const runtime = createHermesRuntimeService({
    hermesBin: "/fake/hermes",
    runCommand: async () => {
      const err = new Error("Command timed out");
      err.stderr = "FATAL: process exceeded limit";
      err.stdout = "";
      err.killed = true;
      throw err;
    }
  });

  await assert.rejects(
    () => runtime.generateDraft({ message: "test", currentDraft: createEmptyDraft() }),
    /FATAL: process exceeded limit/i
  );
});

test("Hermes runtime wrapper rejects non-JSON output and old context/provider blockers", async () => {
  const invalidRuntime = createHermesRuntimeService({
    hermesBin: "/fake/hermes",
    runCommand: async () => "not json"
  });
  await assert.rejects(
    () =>
      invalidRuntime.generateDraft({
        message: "Make a minion",
        currentDraft: createEmptyDraft()
      }),
    /valid JSON/i
  );

  const blockedRuntime = createHermesRuntimeService({
    hermesBin: "/fake/hermes",
    runCommand: async () => "Model has a context window of 64,000 tokens"
  });
  await assert.rejects(
    () =>
      blockedRuntime.generateDraft({
        message: "Make a minion",
        currentDraft: createEmptyDraft()
      }),
    /old context gate/i
  );

  const oldEndpointRuntime = createHermesRuntimeService({
    hermesBin: "/fake/hermes",
    runCommand: async () => "progress-hook-url-index.trycloudflare.com"
  });
  await assert.rejects(
    () =>
      oldEndpointRuntime.generateDraft({
        message: "Make a minion",
        currentDraft: createEmptyDraft()
      }),
    /old custom endpoint/i
  );
});
