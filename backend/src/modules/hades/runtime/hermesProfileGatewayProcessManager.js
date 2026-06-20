import http from "node:http";
import https from "node:https";

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function wait(ms) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeBaseUrl(apiBaseUrl) {
  return String(apiBaseUrl || "").replace(/\/+$/, "");
}

function validateProfileName(profileName) {
  if (!/^[a-zA-Z0-9_-]+$/.test(String(profileName || ""))) {
    throw new Error("Invalid Hermes profile name for gateway launch.");
  }
}

function httpGet(url) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === "https:" ? https : http;
    const req = mod.get(url, { timeout: 3000 }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, body: data }));
    });
    req.on("error", () => resolve(null));
    req.on("timeout", () => { req.destroy(); resolve(null); });
  });
}

export function createHermesProfileGatewayProcessManager({
  hermesBin = "hermes",
  hermesHome = "",
  env = process.env,
  spawn,
  healthTimeoutMs = 30000,
  healthPollMs = 500,
  logger = console,
} = {}) {
  const active = new Map();
  const timeoutMs = parsePositiveInteger(healthTimeoutMs, 30000);
  const pollMs = parsePositiveInteger(healthPollMs, 500);

  async function isHealthy(apiBaseUrl, apiServerKey) {
    try {
      const result = await httpGet(`${normalizeBaseUrl(apiBaseUrl)}/health`);
      return result?.ok === true;
    } catch {
      return false;
    }
  }

  async function waitForHealth(apiBaseUrl, apiServerKey) {
    const deadline = Date.now() + timeoutMs;
    do {
      const healthy = await isHealthy(apiBaseUrl, apiServerKey);
      if (healthy) return true;
      await wait(pollMs);
    } while (Date.now() <= deadline);
    return false;
  }

  async function spawnGateway(profileName) {
    if (typeof spawn !== "function") {
      throw new Error("Hermes profile gateway spawn function is not configured.");
    }

    const stderrChunks = [];
    const child = await spawn(hermesBin, ["-p", profileName, "gateway", "run"], {
      detached: true,
      stdio: ["ignore", "ignore", "pipe"],
      env: {
        ...env,
        ...(hermesHome ? { HERMES_HOME: hermesHome } : {}),
      },
    });

    if (child?.stderr) {
      child.stderr.on("data", (chunk) => {
        stderrChunks.push(chunk);
      });
    }
    if (child && typeof child.unref === "function") {
      child.unref();
    }
    if (child && typeof child.on === "function") {
      child.on("exit", (code) => {
        if (code !== 0 && stderrChunks.length > 0) {
          logger?.warn?.("[Hades Hermes] gateway exited with code " + code, { profileName, stderr: Buffer.concat(stderrChunks).toString("utf8") });
        }
        const entry = active.get(profileName);
        if (entry && entry.child === child) active.delete(profileName);
      });
    }
    active.set(profileName, { child, stderrChunks });
    return child;
  }

  async function ensureGateway({ profileName, apiBaseUrl, apiServerKey } = {}) {
    validateProfileName(profileName);
    if (!apiBaseUrl) {
      throw new Error("Hermes profile apiBaseUrl is required before launching gateway.");
    }

    if (await isHealthy(apiBaseUrl, apiServerKey)) {
      return { profileName, apiBaseUrl, gatewayStatus: "running", spawned: false };
    }

    if (!active.has(profileName)) {
      logger?.info?.("[Hades Hermes] starting profile gateway", { profileName, apiBaseUrl });
      await spawnGateway(profileName);
    }

    if (await waitForHealth(apiBaseUrl, apiServerKey)) {
      return { profileName, apiBaseUrl, gatewayStatus: "running", spawned: true };
    }

    const entry = active.get(profileName);
    const stderr = entry?.stderrChunks?.length ? Buffer.concat(entry.stderrChunks).toString("utf8") : "";
    if (stderr) {
      logger?.error?.("[Hades Hermes] gateway stderr for " + profileName, { profileName, apiBaseUrl, stderr });
    }

    throw new Error(`Hermes profile gateway did not become healthy for ${profileName}.`);
  }

  return { ensureGateway };
}
