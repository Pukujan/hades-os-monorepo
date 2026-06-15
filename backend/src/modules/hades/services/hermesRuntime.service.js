import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createEmptyDraft, VALID_CATEGORIES, VALID_TARGET_SOCIALS, VALID_TRIGGER_TYPES } from "../data.js";
import { buildGeneralChatPrompt } from "../prompts/generalChatPrompt.js";
import { buildForgeChatPrompt } from "../prompts/forgeChatPrompt.js";
import { HADES_APP_ROUTES } from "../hadesAppContext.js";

const DEFAULT_MODEL = "deepseek/deepseek-v4-flash";
const DEFAULT_PROVIDER = "openrouter";
const MIN_CONTEXT_LENGTH = 30000;
const SERVICE_DIR = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(SERVICE_DIR, "../../../../");
const DEFAULT_BACKEND_ENV_PATH = path.join(BACKEND_ROOT, ".env");

function parseDotEnv(text) {
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

function resolveHermesBin() {
  const candidates = [];

  if (process.env.HERMES_BIN_PATH) {
    candidates.push(process.env.HERMES_BIN_PATH);
  }

  candidates.push(...[
    "/opt/hermes-venv/bin/hermes",
    "/app/hermes-agent/venv/bin/hermes",
    "/Users/teresaguajardo/.hermes/hermes-agent/venv/bin/hermes",
    path.join(os.homedir(), ".hermes", "hermes-agent", "venv", "bin", "hermes"),
  ]);

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  return "hermes";
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value || fallback), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readBackendEnv(envPath = DEFAULT_BACKEND_ENV_PATH) {
  if (!fs.existsSync(envPath)) {
    return {};
  }
  return parseDotEnv(fs.readFileSync(envPath, "utf8"));
}

function buildRuntimePrompt({ userId, conversationId, message, currentDraft, contextLength, context = "forge", messages = [] }) {
  const payload = {
    userId,
    conversationId,
    message,
    messages,
    currentDraft: currentDraft || createEmptyDraft(),
    constraints: {
      contextFloor: MIN_CONTEXT_LENGTH,
      configuredContextLength: contextLength
    }
  };

  const isGeneral = context === "general" || context === "minions";
  const jsonKeys = isGeneral
    ? "reply, actions, sessionId"
    : "assistantText, draftPatch, missingFields, suggestions, sessionId";
  const promptBody = isGeneral
    ? buildGeneralChatPrompt({ routes: HADES_APP_ROUTES })
    : buildForgeChatPrompt();
  const constraints = isGeneral ? [] : [
    `Allowed categories: ${VALID_CATEGORIES.join(", ")}.`,
    `Allowed trigger types: ${VALID_TRIGGER_TYPES.join(", ")}.`,
    `Allowed target socials: ${VALID_TARGET_SOCIALS.join(", ")}.`,
    "Keep draftPatch small and only include fields that should change.",
  ];
  const lines = [
    promptBody,
    "",
    `Return only valid JSON with these keys: ${jsonKeys}.`,
    "Do not wrap the JSON in markdown or add commentary.",
    ...constraints,
    "",
    JSON.stringify(payload),
  ];
  return lines.join("\n");
}

function buildCommandArgs(prompt, { provider, model }) {
  return ["--oneshot", prompt, "--provider", provider, "--model", model];
}

function extractJsonCandidate(text) {
  const raw = String(text || "").trim();
  if (!raw) {
    return raw;
  }

  const fenced = raw.match(/```json\s*([\s\S]*?)```/i) || raw.match(/```\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return raw.slice(start, end + 1).trim();
  }

  return raw;
}

function blockError(output, label) {
  return new Error(`Hermes runtime still looks blocked by the old ${label}:\n${output}`);
}

function parseRuntimeOutput(stdout, context = "forge") {
  const output = String(stdout || "").trim();
  if (!output) {
    throw new Error("Hermes runtime returned no output");
  }
  if (/64,?000|64k|below the minimum/i.test(output)) {
    throw blockError(output, "context gate");
  }
  if (/progress-hook-url-index\.trycloudflare\.com/i.test(output)) {
    throw blockError(output, "custom endpoint");
  }

  const isGeneral = context === "general" || context === "minions";
  const candidate = extractJsonCandidate(output);
  try {
    const parsed = JSON.parse(candidate);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Hermes runtime did not return an object");
    }
    return {
      sessionId: typeof parsed.sessionId === "string" ? parsed.sessionId : parsed.session_id || null,
      source: "hermes_runtime",
      reply: typeof parsed.reply === "string" ? parsed.reply : undefined,
      actions: Array.isArray(parsed.actions) ? parsed.actions : undefined,
      assistantText: typeof parsed.assistantText === "string" ? parsed.assistantText : "",
      draftPatch: parsed.draftPatch && typeof parsed.draftPatch === "object" ? parsed.draftPatch : {},
      missingFields: Array.isArray(parsed.missingFields) ? parsed.missingFields : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : []
    };
  } catch (_ignore) {
    if (isGeneral && output.length > 0 && !output.includes("{") && !output.includes("}")) {
      return {
        source: "hermes_runtime",
        sessionId: null,
        reply: output,
        actions: undefined,
        assistantText: "",
        draftPatch: {},
        missingFields: [],
        suggestions: []
      };
    }
    const invalid = new Error(`Hermes runtime returned valid JSON was expected but got:\n${output}`);
    invalid.cause = _ignore;
    throw invalid;
  }
}

export function createHermesRuntimeService({
  hermesBin = resolveHermesBin(),
  backendEnvPath = DEFAULT_BACKEND_ENV_PATH,
  runCommand = execFileSync
} = {}) {
  async function generateDraft({
    userId = "local-user",
    conversationId,
    message,
    messages = [],
    currentDraft = createEmptyDraft(),
    context = "forge"
  } = {}) {
    const backendEnv = readBackendEnv(backendEnvPath);
    const provider = backendEnv.HERMES_PROVIDER || DEFAULT_PROVIDER;
    const model = backendEnv.HERMES_MODEL || backendEnv.OPENROUTER_MODEL || DEFAULT_MODEL;
    const contextLength = parsePositiveInteger(backendEnv.HERMES_CONTEXT_LENGTH, MIN_CONTEXT_LENGTH);
    const prompt = buildRuntimePrompt({
      userId,
      conversationId,
      message,
      messages,
      currentDraft,
      contextLength,
      context
    });
    const subprocessEnv = {
      ...process.env,
      ...backendEnv,
    };
    if (!subprocessEnv.HERMES_HOME) {
      subprocessEnv.HERMES_HOME = "/tmp/hades-hermes";
    }
    if (!subprocessEnv.HERMES_CACHE_DIR) {
      subprocessEnv.HERMES_CACHE_DIR = "/tmp/hades-hermes/cache";
    }
    try {
      const output = await runCommand(hermesBin, buildCommandArgs(prompt, { provider, model }), {
        encoding: "utf8",
        env: subprocessEnv,
      });

      return parseRuntimeOutput(output, context);
    } catch (error) {
      const stderr = error?.stderr ? String(error.stderr).trim() : "";
      const stdout = error?.stdout ? String(error.stdout).trim() : "";
      const detail = [stderr, stdout].filter(Boolean).join("\n");
      if (detail) {
        const wrapped = new Error(`${error?.message || "Hermes runtime failed"}\n${detail}`);
        wrapped.cause = error;
        throw wrapped;
      }
      throw error;
    }
  }

  return { generateDraft };
}
