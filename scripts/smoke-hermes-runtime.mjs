import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createEmptyDraft } from "../backend/src/modules/hades/data.js";
import { createHermesRuntimeService } from "../backend/src/modules/hades/services/hermesRuntime.service.js";
import { DEFAULT_BACKEND_ENV_PATH } from "./hermes-config-sync.mjs";

function resolveHermesBin() {
  const bundled = path.join(os.homedir(), ".hermes", "hermes-agent", "venv", "bin", "hermes");
  if (fs.existsSync(bundled)) {
    return bundled;
  }
  return "hermes";
}

function validateResult(result) {
  if (!result || typeof result !== "object") {
    throw new Error("Hermes runtime smoke returned no structured result");
  }
  if (result.source !== "hermes_runtime") {
    throw new Error(`Hermes runtime smoke did not use the runtime path: ${JSON.stringify(result)}`);
  }
  if (!result.assistantText || typeof result.assistantText !== "string") {
    throw new Error("Hermes runtime smoke did not return assistant text");
  }
  return result;
}

export async function runHermesRuntimeSmoke({
  hermesBin = resolveHermesBin(),
  backendEnvPath = DEFAULT_BACKEND_ENV_PATH,
  runCommand = execFileSync,
  logger = console
} = {}) {
  const runtime = createHermesRuntimeService({
    hermesBin,
    backendEnvPath,
    runCommand
  });

  const result = await runtime.generateDraft({
    userId: "local-user",
    conversationId: "hermes-runtime-smoke",
    message: "Make a Discord command called !sendcatmeme that sends random cat meme gifs.",
    currentDraft: createEmptyDraft()
  });

  const validated = validateResult(result);
  logger.log(
    JSON.stringify({
      source: validated.source,
      sessionId: validated.sessionId || null,
      assistantText: validated.assistantText,
      missingFields: validated.missingFields
    })
  );
  return validated;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await runHermesRuntimeSmoke();
  } catch (error) {
    console.error(error?.message || error);
    process.exitCode = 1;
  }
}
