import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function resolveHermesBin() {
  const bundled = path.join(os.homedir(), ".hermes", "hermes-agent", "venv", "bin", "hermes");
  if (fs.existsSync(bundled)) {
    return bundled;
  }
  return "hermes";
}

function buildCommandArgs(prompt) {
  return ["chat", "--quiet", "--query", prompt, "--source", "tool"];
}

function validateOutput(stdout) {
  const output = String(stdout || "").trim();
  if (!output) {
    throw new Error("Hermes chat returned no output");
  }
  if (/64,?000|64k|below the minimum/i.test(output)) {
    throw new Error(`Hermes chat still looks blocked by the old context gate:\n${output}`);
  }
  if (/progress-hook-url-index\.trycloudflare\.com/i.test(output)) {
    throw new Error(`Hermes chat is still using the old custom endpoint:\n${output}`);
  }
  if (!/\bok\b/i.test(output)) {
    throw new Error(`Hermes chat did not produce the expected ok response:\n${output}`);
  }
  return output;
}

export function runHermesChatSmoke({
  hermesBin = resolveHermesBin(),
  prompt = "Reply exactly ok.",
  logger = console,
  runCommand = execFileSync
} = {}) {
  let output;
  try {
    output = runCommand(hermesBin, buildCommandArgs(prompt), {
      encoding: "utf8",
      env: process.env
    });
  } catch (error) {
    const stderr = error?.stderr ? String(error.stderr).trim() : "";
    const stdout = error?.stdout ? String(error.stdout).trim() : "";
    const detail = [stderr, stdout].filter(Boolean).join("\n");
    if (detail) {
      throw new Error(`${error?.message || "Hermes chat failed"}\n${detail}`);
    }
    throw error;
  }

  const normalized = validateOutput(output);
  logger.log(normalized);
  return normalized;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    runHermesChatSmoke();
  } catch (error) {
    console.error(error?.message || error);
    process.exitCode = 1;
  }
}
