import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  DEFAULT_BACKEND_ENV_PATH,
  syncHermesConfig,
  syncHermesConfigText
} from "./hermes-config-sync.mjs";

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "hermes-config-sync-"));
}

function readFixture() {
  return `
model:
  default: unsloth/Qwen3.6-35B-A3B-MTP-GGUF:UD-IQ4_XS
  provider: custom
  base_url: https://progress-hook-url-index.trycloudflare.com/v1
  api_key: redacted
  context_length: 30720

providers: {}

custom_providers:
  - name: qwen
    base_url: https://progress-hook-url-index.trycloudflare.com/v1
    api_key: redacted
    model: unsloth/Qwen3.6-35B-A3B-MTP-GGUF:UD-IQ4_XS
    context_length: 30720

agent:
  context_length: 30720
  max_context_length: 30720
`.trimStart();
}

test("Hermes sync defaults to backend/.env as the source of truth", () => {
  assert.match(DEFAULT_BACKEND_ENV_PATH, /(?:^|\/)backend\/\.env$/);
});

test("syncHermesConfigText rewrites the active model to OpenRouter deepseek and removes qwen", () => {
  const output = syncHermesConfigText(readFixture(), {
    HERMES_PROVIDER: "openrouter",
    HERMES_MODEL: "deepseek/deepseek-v4-flash",
    HERMES_BASE_URL: "https://openrouter.ai/api/v1",
    HERMES_CONTEXT_LENGTH: "30720"
  });

  assert.match(output, /^model:\n  default: deepseek\/deepseek-v4-flash\n  provider: openrouter\n  base_url: https:\/\/openrouter\.ai\/api\/v1\n  context_length: 30720\n/m);
  assert.equal(/qwen/i.test(output), false);
  assert.match(output, /^  context_length: 30720$/m);
  assert.match(output, /^  max_context_length: 30720$/m);
});

test("syncHermesConfigText accepts a different provider when .env overrides it", () => {
  const output = syncHermesConfigText(readFixture(), {
    HERMES_PROVIDER: "anthropic",
    HERMES_MODEL: "claude-sonnet-4.6",
    HERMES_BASE_URL: "https://api.anthropic.com",
    HERMES_CONTEXT_LENGTH: "64000"
  });

  assert.match(output, /^model:\n  default: claude-sonnet-4.6\n  provider: anthropic\n  base_url: https:\/\/api\.anthropic\.com\n  context_length: 64000\n/m);
  assert.equal(/qwen/i.test(output), false);
});

test("syncHermesConfig rejects context limits below the Hermes floor", () => {
  assert.throws(
    () =>
      syncHermesConfigText(readFixture(), {
        HERMES_CONTEXT_LENGTH: "29999"
      }),
    /must be at least 30000/i
  );
});

test("syncHermesConfig writes a backup and syncs the live config file", () => {
  const tempDir = makeTempDir();
  const envPath = path.join(tempDir, ".env");
  const configPath = path.join(tempDir, "config.yaml");
  fs.writeFileSync(
    envPath,
    [
      "HERMES_PROVIDER=openrouter",
      "HERMES_MODEL=deepseek/deepseek-v4-flash",
      "HERMES_BASE_URL=https://openrouter.ai/api/v1",
      "HERMES_CONTEXT_LENGTH=30720"
    ].join("\n"),
    "utf8"
  );
  fs.writeFileSync(configPath, readFixture(), "utf8");

  const result = syncHermesConfig({
    envPath,
    configPath,
    logger: { log() {} }
  });

  assert.equal(fs.existsSync(result.backupPath), true);
  const synced = fs.readFileSync(configPath, "utf8");
  assert.match(synced, /provider: openrouter/);
  assert.equal(/qwen/i.test(synced), false);
});
