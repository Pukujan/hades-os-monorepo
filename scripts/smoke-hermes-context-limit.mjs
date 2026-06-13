import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function getHermesAgentPath() {
  return path.join(os.homedir(), ".hermes", "hermes-agent");
}

function buildPythonPath(hermesAgentPath) {
  const existing = process.env.PYTHONPATH ? process.env.PYTHONPATH.split(path.delimiter) : [];
  return [hermesAgentPath, ...existing.filter(Boolean)].join(path.delimiter);
}

function resolveHermesPythonBin() {
  const bundled = path.join(os.homedir(), ".hermes", "hermes-agent", "venv", "bin", "python");
  if (fs.existsSync(bundled)) {
    return bundled;
  }
  return "python3";
}

function buildPythonProbe(hermesAgentPath) {
  return `
import json
import sys

sys.path.insert(0, ${JSON.stringify(hermesAgentPath)})

from agent.model_metadata import MINIMUM_CONTEXT_LENGTH, get_model_context_length

model = "deepseek/deepseek-v4-flash"
base_url = "https://openrouter.ai/api/v1"

resolved_30720 = get_model_context_length(
    model,
    base_url=base_url,
    provider="openrouter",
    config_context_length=30720,
)
resolved_29999 = get_model_context_length(
    model,
    base_url=base_url,
    provider="openrouter",
    config_context_length=29999,
)

payload = {
    "minimumContextLength": MINIMUM_CONTEXT_LENGTH,
    "resolved30720": resolved_30720,
    "resolved29999": resolved_29999,
    "accepts30720": resolved_30720 >= MINIMUM_CONTEXT_LENGTH,
    "rejects29999": resolved_29999 < MINIMUM_CONTEXT_LENGTH,
}

print(json.dumps(payload))
`.trim();
}

export function runHermesContextLimitSmoke({ logger = console, pythonBin = "python3" } = {}) {
  const hermesAgentPath = getHermesAgentPath();
  const resolvedPythonBin = pythonBin === "python3" ? resolveHermesPythonBin() : pythonBin;
  const env = {
    ...process.env,
    PYTHONPATH: buildPythonPath(hermesAgentPath)
  };

  const stdout = execFileSync(resolvedPythonBin, ["-c", buildPythonProbe(hermesAgentPath)], {
    env,
    encoding: "utf8"
  }).trim();

  const result = JSON.parse(stdout);

  if (result.minimumContextLength !== 30000) {
    throw new Error(`Expected Hermes minimum context length to be 30000, got ${result.minimumContextLength}`);
  }
  if (!result.accepts30720) {
    throw new Error(`Hermes rejected 30720-context configuration: ${JSON.stringify(result)}`);
  }
  if (!result.rejects29999) {
    throw new Error(`Hermes failed to enforce the minimum on 29999-context configuration: ${JSON.stringify(result)}`);
  }

  logger.log(`Hermes minimum context: ${result.minimumContextLength}`);
  logger.log(`Hermes resolved 30720-context config: ${result.resolved30720}`);
  logger.log(`Hermes resolved 29999-context config: ${result.resolved29999}`);

  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    runHermesContextLimitSmoke();
  } catch (error) {
    console.error(error?.message || error);
    process.exitCode = 1;
  }
}
