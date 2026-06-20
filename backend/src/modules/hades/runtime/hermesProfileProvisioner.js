import { createHash } from "node:crypto";

function sanitizeProfileName(tenantId, userId) {
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
  async function ensureProfile({ userId, tenantId, model = serverEnv.HERMES_DEFAULT_MODEL, provider = serverEnv.HERMES_DEFAULT_PROVIDER } = {}) {
    const profileName = sanitizeProfileName(tenantId, userId);
    const apiServerKey = generateApiServerKey ? generateApiServerKey() : `dev-key-${profileName}-${Date.now()}`;
    const apiPort = allocatePort ? await allocatePort() : 8657;

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
      ];
      if (serverEnv.GROQ_API_KEY) {
        envLines.push(`GROQ_API_KEY=${serverEnv.GROQ_API_KEY}`);
      }
      const envContent = envLines.join("\n");
      await writeFile(`${profilesRoot}/${profileName}/.env`, envContent);

      const configYaml = [
        `terminal:`,
        `  home_mode: profile`,
        ...(model ? [`model: ${model}`] : []),
        ...(provider ? [`provider: ${provider}`] : []),
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
