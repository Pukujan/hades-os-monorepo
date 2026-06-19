import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { mkdir, writeFile, readFile } from "node:fs/promises";

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function requireProofAuth(req, res, next) {
  const proofToken = process.env.HADES_E2E_AUTH_TOKEN || "proof-token-change-me";
  const auth = req.headers.authorization || "";
  if (auth !== `Bearer ${proofToken}`) {
    return res.status(401).json({ error: "invalid proof auth" });
  }
  next();
}

export function createHermesSessionRoutes({
  config,
  processManager,
  stateRepository,
  profileSessionBroker,
  profileRegistry,
  profileStatePersistence,
  hermesFilesystem,
  edgeAuthProxy,
  profileProvisioner,
} = {}) {
  const router = Router();

  router.post(
    "/sessions",
    asyncRoute(async (req, res) => {
      if (profileSessionBroker) {
        const authHeader = req.headers.authorization || "";
        const supabaseJwt = authHeader.startsWith("Bearer ")
          ? authHeader.slice(7)
          : null;
        const origin = `${req.protocol}://${req.get("host")}`;
        const session = await profileSessionBroker.startSession({ supabaseJwt, origin });
        return res.status(200).json(session);
      }

      const { userId, tenantId } = resolveAuth(req);
      res.status(200).json({
        profileName: `${tenantId}_${userId}`,
        hermesApiBaseUrl: `/hermes/${tenantId}_${userId}/v1`,
        authMode: "edge_injected",
        routingToken: null,
      });
    })
  );

  router.get(
    "/state",
    asyncRoute(async (req, res) => {
      const { userId, tenantId } = resolveAuth(req);
      const objects = stateRepository
        ? await stateRepository.listStateObjects({ userId, tenantId })
        : [];
      const sanitized = objects.map((obj) => ({
        objectKey: obj.object_key || obj.objectKey,
        contentHash: obj.content_hash || obj.contentHash,
      }));
      res.status(200).json({ objects: sanitized });
    })
  );

  // --- Edge proxy route — forwards /:profileName/v1/* to profile's Hermes API server ---

  router.all(
    "/:profileName/v1/*",
    asyncRoute(async (req, res) => {
      if (edgeAuthProxy) {
        const profileName = req.params.profileName;
        const wildPath = req.params[0] || "";
        const proxyPath = `/v1/${wildPath}`;

        const result = await edgeAuthProxy.forward({
          profileName,
          path: proxyPath,
          method: req.method,
          headers: req.headers,
          body: req.method !== "GET" && req.method !== "HEAD" ? JSON.stringify(req.body) : undefined,
        });

        res.status(result.status);
        if (result.headers && typeof result.headers === "object") {
          for (const [key, value] of Object.entries(result.headers)) {
            if (key !== "content-length") {
              res.setHeader(key, value);
            }
          }
        }
        if (result.body) {
          res.send(result.body);
        } else {
          res.end();
        }
        return;
      }

      res.status(503).json({ error: "edge proxy not configured" });
    })
  );

  router.post(
    "/proof/create",
    requireProofAuth,
    asyncRoute(async (req, res) => {
      const { profileName, tenantId, userId } = req.body || {};
      const effectiveTenant = tenantId || "anonymous";
      const effectiveUser = userId || "anonymous";

      if (!profileProvisioner) {
        return res.status(503).json({ error: "profileProvisioner not configured" });
      }

      const provisioned = await profileProvisioner.ensureProfile({
        userId: effectiveUser,
        tenantId: effectiveTenant,
        model: req.body.model,
        provider: req.body.provider,
      });

      let registered = null;
      if (profileRegistry) {
        const upserted = await profileRegistry.upsertProfile({
          tenantId: effectiveTenant,
          userId: effectiveUser,
          profileName: provisioned.profileName,
          apiHost: "127.0.0.1",
          apiPort: parseInt(provisioned.apiBaseUrl.split(":")[2], 10) || 8657,
          edgeBaseUrl: `${process.env.HERMES_PUBLIC_BASE_URL || "/api/hades/hermes"}/${provisioned.profileName}/v1`,
          apiServerKey: "",
          gatewayStatus: "provisioned",
        });
        registered = upserted;
      }

      res.status(201).json({
        profileName: provisioned.profileName,
        apiBaseUrl: provisioned.apiBaseUrl,
        apiServerKeyHash: provisioned.apiServerKeyHash,
        registered,
      });
    })
  );

  // --- State index (persistent, survives restart) ---

  async function getStateIndexDir() {
    const dir = process.env.HERMES_HOME
      ? path.join(process.env.HERMES_HOME, "state-index")
      : "/data/hermes/state-index";
    await mkdir(dir, { recursive: true });
    return dir;
  }

  router.post(
    "/state-index",
    asyncRoute(async (req, res) => {
      const { profileName, eventType, objectKey, contentHash } = req.body || {};
      if (!profileName || !eventType || !objectKey || !contentHash) {
        return res.status(400).json({ error: "profileName, eventType, objectKey, contentHash required" });
      }
      const dir = await getStateIndexDir();
      const filePath = path.join(dir, `${contentHash}.json`);
      await writeFile(filePath, JSON.stringify({ profileName, eventType, objectKey, contentHash, createdAt: new Date().toISOString() }), "utf8");
      res.status(200).json({ stored: true, contentHash });
    })
  );

  router.get(
    "/state-index",
    asyncRoute(async (req, res) => {
      const { profileName, contentHash } = req.query;
      if (!profileName || !contentHash) {
        return res.status(400).json({ error: "profileName and contentHash query params required" });
      }
      const dir = await getStateIndexDir();
      const filePath = path.join(dir, `${contentHash}.json`);
      try {
        const data = await readFile(filePath, "utf8");
        return res.json(JSON.parse(data));
      } catch {
        return res.status(404).json({ error: "state entry not found", contentHash });
      }
    })
  );

  // --- Proof hooks (admin-only, protected by HADES_E2E_AUTH_TOKEN) ---

  router.get(
    "/proof/profile",
    requireProofAuth,
    asyncRoute(async (req, res) => {
      const profileName = req.query.profileName;
      if (!profileName) {
        return res.status(400).json({ error: "profileName query param required" });
      }

      const profile = profileRegistry
        ? await profileRegistry.findProfile({ profileName })
        : null;
      if (!profile) {
        return res.status(404).json({ error: `profile not found: ${profileName}` });
      }

      const hermesHomeDir = process.env.HERMES_HOME || path.join(process.cwd(), ".hermes-home");
      const profilesRoot = process.env.HERMES_PROFILES_ROOT || path.join(hermesHomeDir, "profiles");
      const hermesHome = profile.hermesHome || path.join(profilesRoot, profileName);
      const platform = process.env.HADES_PLATFORM || "local";
      const railwayVolumeMountPath = process.env.RAILWAY_VOLUME_MOUNT_PATH || "";

      let state = { hasStateDb: false, hasSessionsDir: false, hasMemoriesDir: false, hasEnvFile: false, envReturned: false };
      if (fs.existsSync(hermesHome)) {
        state.hasStateDb = fs.existsSync(path.join(hermesHome, "state.db"));
        state.hasSessionsDir = fs.existsSync(path.join(hermesHome, "sessions"));
        state.hasMemoriesDir = fs.existsSync(path.join(hermesHome, "memories"));
        state.hasEnvFile = fs.existsSync(path.join(hermesHome, ".env"));
      }

      res.json({
        profileName: profile.profileName,
        hermesApiBaseUrl: profile.edgeBaseUrl || "",
        authMode: "edge_injected",
        platform,
        profilesRoot,
        railwayVolumeMountPath,
        hermesHome,
        apiHost: profile.apiHost,
        apiPort: profile.apiPort,
        apiServerKeyHash: profile.apiServerKeyHash,
        directBrowserReachable: false,
        rawProfilePortPublic: false,
        state,
      });
    })
  );

  router.post(
    "/proof/snapshot",
    requireProofAuth,
    asyncRoute(async (req, res) => {
      const { profileName, reason } = req.body || {};
      if (!profileName) {
        return res.status(400).json({ error: "profileName required in body" });
      }

      if (!profileStatePersistence) {
        return res.status(503).json({ error: "profileStatePersistence not configured" });
      }

      const profile = profileRegistry
        ? await profileRegistry.findProfile({ profileName })
        : null;
      if (!profile) {
        return res.status(404).json({ error: `profile not found: ${profileName}` });
      }

      const snapshot = await profileStatePersistence.snapshotProfile({
        tenantId: profile.tenantId,
        userId: profile.userId,
        profileName: profile.profileName,
        reason: reason || "final-proof",
      });

      res.json(snapshot);
    })
  );

  router.post(
    "/proof/restart",
    requireProofAuth,
    asyncRoute(async (req, res) => {
      res.json({ status: "restarting" });

      setImmediate(() => {
        process.exit(0);
      });
    })
  );

  return router;
}

function resolveAuth(req) {
  if (req.authContext) {
    return {
      userId: req.authContext.userId,
      tenantId: req.authContext.tenantId,
    };
  }
  return {
    userId: req.headers["x-user-id"] || "e2e-test-user",
    tenantId: req.headers["x-tenant-id"] || "e2e-test-tenant",
  };
}
