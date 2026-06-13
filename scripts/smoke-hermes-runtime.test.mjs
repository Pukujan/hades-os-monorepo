import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runHermesRuntimeSmoke } from "./smoke-hermes-runtime.mjs";

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "hermes-runtime-smoke-"));
}

test("Hermes runtime smoke uses backend env and accepts parseable runtime JSON", async () => {
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
  const result = await runHermesRuntimeSmoke({
    hermesBin: "/fake/hermes",
    backendEnvPath,
    runCommand: async (bin, args, options) => {
      calls.push({ bin, args, options });
      return JSON.stringify({
        assistantText: "ok",
        draftPatch: { name: "Cat Meme Minion" },
        missingFields: [],
        suggestions: []
      });
    },
    logger: { log() {} }
  });

  assert.equal(result.assistantText, "ok");
  assert.equal(calls.length, 1);
  assert.ok(calls[0].args.includes("--oneshot"));
  assert.ok(calls[0].args.includes("--provider"));
  assert.ok(calls[0].args.includes("openrouter"));
  assert.ok(calls[0].args.includes("--model"));
  assert.ok(calls[0].args.includes("deepseek/deepseek-v4-flash"));
  assert.equal(calls[0].options.env.OPENROUTER_API_KEY, "backend-secret");
});

test("Hermes runtime smoke rejects old provider and context failures", async () => {
  await assert.rejects(
    () =>
      runHermesRuntimeSmoke({
        hermesBin: "/fake/hermes",
        runCommand: async () => "Model requires a 64k minimum context",
        logger: { log() {} }
      }),
    /old context gate/i
  );

  await assert.rejects(
    () =>
      runHermesRuntimeSmoke({
        hermesBin: "/fake/hermes",
        runCommand: async () => "progress-hook-url-index.trycloudflare.com",
        logger: { log() {} }
      }),
    /old custom endpoint/i
  );

  await assert.rejects(
    () =>
      runHermesRuntimeSmoke({
        hermesBin: "/fake/hermes",
        runCommand: async () => "plain text, not json",
        logger: { log() {} }
      }),
    /valid JSON/i
  );
});
