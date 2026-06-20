import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SOUL_PATH = path.join(__dirname, "..", "souls", "default.profile.soul.md");
function loadDefaultSoul() {
  try {
    return readFileSync(DEFAULT_SOUL_PATH, "utf8");
  } catch {
    return "# Hades Soul\n\nHades is the quiet command layer of Hades OS.\n";
  }
}

export function sanitizeProfileName(tenantId, userId) {
  const raw = `${tenantId}_${userId}`;
  let name = raw.replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").toLowerCase() || "unknown";
  const dangerous = ["whoami", "rm", "sudo", "su", "exec", "eval", "chmod", "chown", "kill", "pkill", "shutdown", "reboot", "init", "dd", "mkfs"];
  for (const word of dangerous) {
    name = name.replace(new RegExp(word, "g"), "");
  }
  name = name.replace(/_+/g, "_").replace(/^_|_$/g, "");
  return name || "unknown";
}

function hashKey(key) {
  return "sha256:" + createHash("sha256").update(key).digest("hex");
}

export function createHermesProfileProvisioner({ hermesBin = "hermes", profilesRoot = "", run, writeFile, mkdir, allocatePort, generateApiServerKey, serverEnv = {} } = {}) {
  async function ensureProfile({ userId, tenantId, model = serverEnv.HERMES_DEFAULT_MODEL || serverEnv.OPENROUTER_MODEL || "deepseek/deepseek-v4-flash", provider = serverEnv.HERMES_DEFAULT_PROVIDER || "openrouter", telegramBotToken, apiServerKey: existingKey, apiPort: existingPort } = {}) {
    const profileName = sanitizeProfileName(tenantId, userId);
    const apiServerKey = existingKey || (generateApiServerKey ? generateApiServerKey() : `dev-key-${profileName}-${Date.now()}`);
    const apiPort = existingPort || (allocatePort ? await allocatePort() : 8657);

    if (run) {
      try {
        await run(`${hermesBin} profile create ${profileName}`);
      } catch {
      }
    }

    if (writeFile) {
      const envLines = [
        `API_SERVER_ENABLED=true`,
        `API_SERVER_HOST=127.0.0.1`,
        `API_SERVER_PORT=${apiPort}`,
        `API_SERVER_KEY=${apiServerKey}`,
        `STT_GROQ_MODEL=whisper-large-v3-turbo`,
        `HERMES_IGNORE_RULES=true`,
      ];
      if (serverEnv.GROQ_API_KEY) {
        envLines.push(`GROQ_API_KEY=${serverEnv.GROQ_API_KEY}`);
      }
      if (telegramBotToken || serverEnv.TELEGRAM_BOT_TOKEN) {
        envLines.push(`TELEGRAM_BOT_TOKEN=${telegramBotToken || serverEnv.TELEGRAM_BOT_TOKEN}`);
      }
      const envContent = envLines.join("\n");
      await writeFile(`${profilesRoot}/${profileName}/.env`, envContent);

      const soulContent = loadDefaultSoul();
      await writeFile(`${profilesRoot}/${profileName}/SOUL.md`, soulContent);
      const configYaml = [
        `terminal:`,
        `  home_mode: profile`,
        ...(model ? [`model: ${model}`] : []),
        ...(provider ? [`provider: ${provider}`] : []),
        `personality: hades`,
        ``,
        `personalities:`,
        `  hades:`,
        `    system_prompt: |`,
        ...soulContent.split("\n").map(line => `      ${line}`),
        ``,
        `stt:`,
        `  provider: groq`,
        ``,
        `tts:`,
        `  provider: edge`,
        ``,
        `auxiliary:`,
        `  vision:`,
        `    provider: openrouter`,
        `    model: qwen/qwen3-vl-8b-instruct`,
        ``,
        `toolsets:`,
        `  - vision`,
        `  - image_gen`,
        `  - video_gen`,
      ].join("\n");
      await writeFile(`${profilesRoot}/${profileName}/config.yaml`, configYaml);

      await writeFile(`${profilesRoot}/${profileName}/state.db`, "");
      await writeFile(`${profilesRoot}/${profileName}/sessions/.gitkeep`, "");
      await writeFile(`${profilesRoot}/${profileName}/memories/.gitkeep`, "");
    }

    const profile = {
      profileName,
      apiBaseUrl: `http://127.0.0.1:${apiPort}`,
      apiServerKeyHash: hashKey(apiServerKey),
    };
    Object.defineProperty(profile, "apiServerKey", {
      value: apiServerKey,
      enumerable: false,
      configurable: false,
      writable: false,
    });
    return profile;
  }

  return { ensureProfile };
}
