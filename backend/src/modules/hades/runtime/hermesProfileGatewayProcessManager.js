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

export function createHermesProfileGatewayProcessManager({
  hermesBin = "hermes",
  hermesHome = "",
  env = process.env,
  fetch: fetch_ = globalThis.fetch?.bind(globalThis),
  spawn,
  healthTimeoutMs = 15000,
  healthPollMs = 250,
  logger = console,
} = {}) {
  const active = new Map();
  const timeoutMs = parsePositiveInteger(healthTimeoutMs, 15000);
  const pollMs = parsePositiveInteger(healthPollMs, 250);

  async function isHealthy(apiBaseUrl, apiServerKey) {
    if (typeof fetch_ !== "function") return false;
    try {
      const response = await fetch_(`${normalizeBaseUrl(apiBaseUrl)}/health`, {
        method: "GET",
        headers: apiServerKey ? { authorization: `Bearer ${apiServerKey}` } : {},
      });
      return Boolean(response?.ok);
    } catch {
      return false;
    }
  }

  async function waitForHealth(apiBaseUrl, apiServerKey) {
    const deadline = Date.now() + timeoutMs;
    do {
      if (await isHealthy(apiBaseUrl, apiServerKey)) return true;
      await wait(pollMs);
    } while (Date.now() <= deadline);
    return false;
  }

  async function spawnGateway(profileName) {
    if (typeof spawn !== "function") {
      throw new Error("Hermes profile gateway spawn function is not configured.");
    }

    const child = await spawn(hermesBin, ["-p", profileName, "gateway"], {
      detached: true,
      stdio: "ignore",
      env: {
        ...env,
        ...(hermesHome ? { HERMES_HOME: hermesHome } : {}),
      },
    });

    if (child && typeof child.unref === "function") {
      child.unref();
    }
    if (child && typeof child.on === "function") {
      child.on("exit", () => {
        if (active.get(profileName) === child) active.delete(profileName);
      });
    }
    active.set(profileName, child);
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

    throw new Error(`Hermes profile gateway did not become healthy for ${profileName}.`);
  }

  return { ensureGateway };
}
