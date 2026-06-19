function raise(message) {
  throw new Error(message);
}

const SECRET_FILE_PATTERNS = [
  ".env",
  "auth.json",
  "mcp-tokens",
  "API_SERVER_KEY",
];

const ALLOWLIST = new Set([
  "state.db",
  "sessions",
  "memories",
]);

function isSecretPath(relativePath) {
  return SECRET_FILE_PATTERNS.some(
    (pattern) => relativePath === pattern || relativePath.startsWith(pattern + "/") || relativePath.includes(pattern)
  );
}

function isAllowlisted(relativePath) {
  return ALLOWLIST.has(relativePath) || [...ALLOWLIST].some(
    (prefix) => relativePath.startsWith(prefix + "/") || relativePath.startsWith(prefix + "\\")
  );
}

export function createHermesProfileStatePersistence({ platform, profilesRoot = "", railwayVolumeMountPath = "", filesystem, objectStore } = {}) {
  if (platform === "railway") {
    const volume = railwayVolumeMountPath.replace(/\\/g, "/").replace(/\/+$/, "");
    const root = profilesRoot.replace(/\\/g, "/").replace(/\/+$/, "");
    if (!root.startsWith(volume + "/") && root !== volume) {
      raise(`HERMES_PROFILES_ROOT must be inside RAILWAY_VOLUME_MOUNT_PATH for persistent profile state`);
    }
  }

  function resolveProfileHome({ tenantId, userId, profileName }) {
    const safeTenant = String(tenantId).replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeUser = String(userId).replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeProfile = String(profileName || `${safeTenant}_${safeUser}`).replace(/[^a-zA-Z0-9_-]/g, "_");
    const root = profilesRoot.replace(/\\/g, "/").replace(/\/+$/, "");
    return `${root}/${safeProfile}`;
  }

  async function snapshotProfile({ tenantId, userId, profileName, reason } = {}) {
    const profileHome = resolveProfileHome({ tenantId, userId, profileName });
    const entries = filesystem ? await filesystem.readTree({ root: profileHome }) : [];

    const snapshotEntries = [];
    let secretStripped = false;
    const includes = [];

    for (const entry of entries || []) {
      if (isSecretPath(entry.relativePath)) {
        secretStripped = true;
        continue;
      }
      if (isAllowlisted(entry.relativePath)) {
        snapshotEntries.push(entry);
        const dir = entry.relativePath.includes("/") ? entry.relativePath.split("/")[0] + "/" : entry.relativePath;
        if (!includes.includes(dir)) includes.push(dir);
      }
    }

    const snapshotId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const objectKey = `profiles/${tenantId}/users/${userId}/${profileName}/snapshots/${snapshotId}.json`;

    const snapshot = {
      objectKey,
      tenantId,
      userId,
      profileName,
      reason: reason || "manual",
      snapshotId,
      includes,
      entries: snapshotEntries,
      secretStripped,
      createdAt: new Date().toISOString(),
      visibility: "private",
    };

    if (objectStore) {
      await objectStore.putJson({ key: objectKey, value: snapshot });
    }

    return {
      objectKey,
      visibility: "private",
      secretStripped,
      includes: includes.sort(),
    };
  }

  async function restoreProfile({ tenantId, userId, profileName, objectKey } = {}) {
    const profileHome = resolveProfileHome({ tenantId, userId, profileName });
    let snapshot;

    if (objectStore && objectKey) {
      snapshot = await objectStore.getJson({ key: objectKey });
    }

    const entries = (snapshot?.entries || []).filter(
      (entry) => entry && !isSecretPath(entry.relativePath) && isAllowlisted(entry.relativePath)
    );

    if (filesystem && entries.length > 0) {
      await filesystem.writeTree({ root: profileHome, entries });
    }

    return { restored: entries.length };
  }

  return { resolveProfileHome, snapshotProfile, restoreProfile };
}
