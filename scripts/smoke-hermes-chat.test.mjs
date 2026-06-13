import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runHermesChatSmoke } from "./smoke-hermes-chat.mjs";

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "hermes-chat-smoke-"));
}

test("Hermes chat smoke uses the quiet one-shot chat command and accepts ok output", () => {
  const calls = [];
  const output = runHermesChatSmoke({
    hermesBin: "/fake/hermes",
    runCommand: (bin, args, options) => {
      calls.push({ bin, args, options });
      return "ok";
    },
    logger: { log() {} }
  });

  assert.equal(output, "ok");
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].args, ["chat", "--quiet", "--query", "Reply exactly ok.", "--source", "tool"]);
});

test("Hermes chat smoke reads the backend env file for OpenRouter credentials", () => {
  const tempDir = makeTempDir();
  const backendEnvPath = path.join(tempDir, "backend.env");
  fs.writeFileSync(
    backendEnvPath,
    [
      "OPENROUTER_API_KEY=backend-secret",
      "OPENROUTER_MODEL=deepseek/deepseek-v4-flash"
    ].join("\n"),
    "utf8"
  );

  const calls = [];
  runHermesChatSmoke({
    hermesBin: "/fake/hermes",
    backendEnvPath,
    runCommand: (bin, args, options) => {
      calls.push({ bin, args, options });
      return "ok";
    },
    logger: { log() {} }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.env.OPENROUTER_API_KEY, "backend-secret");
  assert.equal(calls[0].options.env.OPENROUTER_MODEL, "deepseek/deepseek-v4-flash");
});

test("Hermes chat smoke rejects old endpoint and 64k block text", () => {
  assert.throws(
    () =>
      runHermesChatSmoke({
        hermesBin: "/fake/hermes",
        runCommand: () => "session_id: 1\nConnection error.\nprogress-hook-url-index.trycloudflare.com",
        logger: { log() {} }
      }),
    /old custom endpoint/i
  );

  assert.throws(
    () =>
      runHermesChatSmoke({
        hermesBin: "/fake/hermes",
        runCommand: () => "session_id: 1\nModel has a context window of 64,000 tokens",
        logger: { log() {} }
      }),
    /old context gate/i
  );
});
