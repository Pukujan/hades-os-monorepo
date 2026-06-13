import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULTS = {
  provider: "openrouter",
  model: "deepseek/deepseek-v4-flash",
  baseUrl: "https://openrouter.ai/api/v1",
  contextLength: 30720
};

const MIN_CONTEXT_LENGTH = 30000;
const DEFAULT_HERMES_HOME = path.join(os.homedir(), ".hermes");
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
export const DEFAULT_BACKEND_ENV_PATH = path.join(REPO_ROOT, "backend", ".env");

function parsePositiveInteger(value, keyName) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${keyName} must be a positive integer, got ${JSON.stringify(value)}`);
  }
  if (keyName === "HERMES_CONTEXT_LENGTH" && parsed < MIN_CONTEXT_LENGTH) {
    throw new Error(
      `${keyName} must be at least ${MIN_CONTEXT_LENGTH}, got ${parsed}`
    );
  }
  return parsed;
}

export function parseDotEnv(text) {
  const env = {};
  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const normalized = line.startsWith("export ") ? line.slice(7).trim() : line;
    const eqIndex = normalized.indexOf("=");
    if (eqIndex < 0) continue;
    const key = normalized.slice(0, eqIndex).trim();
    if (!key) continue;
    let value = normalized.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function readEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    return {};
  }
  return parseDotEnv(fs.readFileSync(envPath, "utf8"));
}

function resolveDesiredModelConfig(env) {
  const provider = env.HERMES_PROVIDER || DEFAULTS.provider;
  const model = env.HERMES_MODEL || DEFAULTS.model;
  const baseUrl =
    env.HERMES_BASE_URL ||
    env.OPENROUTER_BASE_URL ||
    (provider === "openrouter" ? DEFAULTS.baseUrl : "");
  const contextLength = parsePositiveInteger(
    env.HERMES_CONTEXT_LENGTH || DEFAULTS.contextLength,
    "HERMES_CONTEXT_LENGTH"
  );

  return {
    provider,
    model,
    baseUrl,
    contextLength
  };
}

function replaceTopLevelModelBlock(text, desired) {
  const replacement = [
    "model:",
    `  default: ${desired.model}`,
    `  provider: ${desired.provider}`,
    `  base_url: ${desired.baseUrl}`,
    `  context_length: ${desired.contextLength}`,
    ""
  ].join("\n");

  const pattern = /^model:\n(?:  .*\n)*\n/m;
  if (!pattern.test(text)) {
    throw new Error("Could not find top-level model block in Hermes config");
  }
  return text.replace(pattern, replacement);
}

function replaceAgentContextValues(text, contextLength) {
  let updated = text;
  updated = updated.replace(
    /^  context_length:\s*\d+\s*$/m,
    `  context_length: ${contextLength}`
  );
  updated = updated.replace(
    /^  max_context_length:\s*\d+\s*$/m,
    `  max_context_length: ${contextLength}`
  );
  return updated;
}

function shouldRemoveCustomProvider(entryText) {
  return /name:\s*qwen\b/i.test(entryText)
    || /unsloth\/Qwen3\.6-35B-A3B-MTP-GGUF:UD-IQ4_XS/i.test(entryText)
    || /progress-hook-url-index\.trycloudflare\.com/i.test(entryText);
}

function replaceCustomProvidersBlock(text) {
  const start = text.indexOf("custom_providers:\n");
  if (start < 0) {
    return text;
  }

  const afterHeader = text.slice(start + "custom_providers:\n".length);
  const nextTopLevel = afterHeader.search(/\n[A-Za-z_][A-Za-z0-9_]*:/);
  const end = nextTopLevel >= 0
    ? start + "custom_providers:\n".length + nextTopLevel + 1
    : text.length;

  const section = text.slice(start + "custom_providers:\n".length, end).trimEnd();
  const entries = section ? section.split(/\n(?=  - )/).filter(Boolean) : [];
  const kept = entries.filter((entry) => !shouldRemoveCustomProvider(entry));

  if (kept.length === 0) {
    return text.slice(0, start) + text.slice(end);
  }

  const rebuiltSection = `custom_providers:\n${kept.map((entry) => entry.trimEnd()).join("\n")}\n\n`;
  return text.slice(0, start) + rebuiltSection + text.slice(end);
}

function ensureTrailingNewline(text) {
  return text.endsWith("\n") ? text : `${text}\n`;
}

export function syncHermesConfigText(text, env = {}) {
  const desired = resolveDesiredModelConfig(env);
  let updated = String(text || "");
  updated = replaceTopLevelModelBlock(updated, desired);
  updated = replaceAgentContextValues(updated, desired.contextLength);
  updated = replaceCustomProvidersBlock(updated);
  return ensureTrailingNewline(updated);
}

export function syncHermesConfig({
  envPath = DEFAULT_BACKEND_ENV_PATH,
  configPath = path.join(DEFAULT_HERMES_HOME, "config.yaml"),
  logger = console
} = {}) {
  const env = readEnvFile(envPath);
  const currentText = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "";
  const nextText = syncHermesConfigText(currentText, env);

  const backupPath = `${configPath}.bak`;
  if (fs.existsSync(configPath)) {
    fs.copyFileSync(configPath, backupPath);
  }
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, nextText, "utf8");

  logger.log(`Synced Hermes config: ${configPath}`);
  logger.log(`Backup written: ${backupPath}`);

  return {
    env,
    configPath,
    backupPath,
    text: nextText
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    syncHermesConfig();
  } catch (error) {
    console.error(error?.message || error);
    process.exitCode = 1;
  }
}
