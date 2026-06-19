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

export function createHermesProfileProvisioner({ hermesBin = "hermes", profilesRoot = "", run, writeFile, mkdir, allocatePort, generateApiServerKey } = {}) {
  async function ensureProfile({ userId, tenantId, model, provider } = {}) {
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
      const envContent = [
        `API_SERVER_ENABLED=true`,
        `API_SERVER_HOST=127.0.0.1`,
        `API_SERVER_PORT=${apiPort}`,
        `API_SERVER_KEY=${apiServerKey}`,
      ].join("\n");
      await writeFile(`${profilesRoot}/${profileName}/.env`, envContent);

      const configYaml = [
        `terminal:`,
        `  home_mode: profile`,
        ...(model ? [`model: ${model}`] : []),
        ...(provider ? [`provider: ${provider}`] : []),
      ].join("\n");
      await writeFile(`${profilesRoot}/${profileName}/config.yaml`, configYaml);

      await writeFile(`${profilesRoot}/${profileName}/state.db`, "");
      await writeFile(`${profilesRoot}/${profileName}/sessions/.gitkeep`, "");
      await writeFile(`${profilesRoot}/${profileName}/memories/.gitkeep`, "");
    }

    return {
      profileName,
      apiBaseUrl: `http://127.0.0.1:${apiPort}`,
      apiServerKeyHash: hashKey(apiServerKey),
    };
  }

  return { ensureProfile };
}
