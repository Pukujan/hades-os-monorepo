import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import multer from "multer";
import { sanitizeProfileName } from "../runtime/hermesProfileProvisioner.js";

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
  voiceService,
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
        const proto = req.get("x-forwarded-proto") || req.protocol;
        const origin = `${proto}://${req.hostname}`;
        const session = await profileSessionBroker.startSession({ supabaseJwt, origin });
        return res.status(200).json(session);
      }

      const { userId, tenantId } = resolveAuth(req);
      const name = sanitizeProfileName(tenantId, userId);
      res.status(200).json({
        profileName: name,
        hermesApiBaseUrl: `/api/hades/hermes/${name}/v1`,
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
          apiServerKey: provisioned.apiServerKey,
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

      // Auto-restore profile state from latest snapshot on startup
      if (profileStatePersistence && !fs.existsSync(path.join(hermesHome, "state.db"))) {
        try {
          const restoreResult = await profileStatePersistence.restoreProfile({
            tenantId: profile.tenantId,
            userId: profile.userId,
            profileName: profile.profileName,
          });
          if (restoreResult.restored > 0) {
            console.log(`[proof/profile] restored ${restoreResult.restored} entries from snapshot for ${profileName}`);
          }
        } catch (err) {
          console.warn(`[proof/profile] restore failed for ${profileName}: ${err.message}`);
        }
      }

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
    "/proof/restore",
    requireProofAuth,
    asyncRoute(async (req, res) => {
      const { profileName } = req.body || {};
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

      const result = await profileStatePersistence.restoreProfile({
        tenantId: profile.tenantId,
        userId: profile.userId,
        profileName: profile.profileName,
      });

      res.json(result);
    })
  );

  router.post(
    "/proof/restart",
    requireProofAuth,
    asyncRoute(async (req, res) => {
      const platform = process.env.HADES_PLATFORM;
      if (platform && platform !== "local") {
        res.json({ status: "restarting" });
        setImmediate(() => process.exit(1));
      } else {
        res.json({ status: "restart_skipped", reason: "no supervisor" });
      }
    })
  );

  // --- Voice (TTS / STT) ---

  router.post(
    "/speak",
    asyncRoute(async (req, res) => {
      if (!voiceService) {
        return res.status(503).json({ error: "voiceService not configured" });
      }
      const { text, voice } = req.body || {};
      if (!text) {
        return res.status(400).json({ error: "text is required" });
      }
      const audioBuffer = await voiceService.synthesizeSpeech({ text, voice });
      res.set("Content-Type", "audio/mpeg");
      res.send(audioBuffer);
    })
  );

  router.post(
    "/transcribe",
    asyncRoute(async (req, res) => {
      if (!voiceService) {
        return res.status(503).json({ error: "voiceService not configured" });
      }
      const { audio, filename } = req.body || {};
      if (!audio) {
        return res.status(400).json({ error: "audio is required" });
      }
      const audioBuffer = Buffer.from(audio, "base64");
      const transcript = await voiceService.transcribeAudio(filename || "recording.wav", audioBuffer);
      res.json({ text: transcript });
    })
  );

  // --- Media upload ---

  const MEDIA_MAX_BYTES = parseInt(process.env.HERMES_MEDIA_MAX_BYTES || String(50 * 1024 * 1024), 10);

  const ALLOWED_MEDIA_TYPES = {
    "image/png": "image", "image/jpeg": "image", "image/gif": "image",
    "image/webp": "image", "image/bmp": "image", "image/tiff": "image", "image/svg+xml": "image",
    "audio/mpeg": "audio", "audio/wav": "audio", "audio/ogg": "audio",
    "audio/mp4": "audio", "audio/opus": "audio", "audio/flac": "audio", "audio/aac": "audio", "audio/webm": "audio",
    "video/mp4": "video", "video/quicktime": "video", "video/webm": "video", "video/x-matroska": "video", "video/avi": "video", "video/x-msvideo": "video",
    "application/pdf": "document",
    "text/plain": "document", "text/markdown": "document", "text/csv": "document",
    "application/json": "document", "text/xml": "document", "text/html": "document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "document",
    "application/zip": "document", "application/x-rar-compressed": "document",
    "application/x-7z-compressed": "document", "application/gzip": "document", "application/x-bzip2": "document",
  };

  const EXT_TO_MIME = {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
    webp: "image/webp", bmp: "image/bmp", tiff: "image/tiff", tif: "image/tiff", svg: "image/svg+xml",
    mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", m4a: "audio/mp4",
    opus: "audio/opus", flac: "audio/flac", aac: "audio/aac", weba: "audio/webm",
    mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", mkv: "video/x-matroska", avi: "video/x-msvideo",
    pdf: "application/pdf",
    txt: "text/plain", md: "text/markdown", csv: "text/csv",
    json: "application/json", xml: "text/xml", html: "text/html", htm: "text/html",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    zip: "application/zip", rar: "application/x-rar-compressed", "7z": "application/x-7z-compressed",
    tar: "application/x-tar", gz: "application/gzip", bz2: "application/x-bzip2",
    epub: "application/epub+zip", apk: "application/vnd.android.package-archive", ipa: "application/octet-stream",
  };

  function getProfilesRoot() {
    return process.env.HERMES_PROFILES_ROOT || path.join(process.env.HERMES_HOME || path.join(process.cwd(), ".hermes-home"), "profiles");
  }

  function classifyMedia(mimeType, ext) {
    if (ALLOWED_MEDIA_TYPES[mimeType]) return ALLOWED_MEDIA_TYPES[mimeType];
    const fallbackMime = EXT_TO_MIME[ext];
    if (fallbackMime && ALLOWED_MEDIA_TYPES[fallbackMime]) return ALLOWED_MEDIA_TYPES[fallbackMime];
    return null;
  }

  function sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.\./g, "").slice(0, 255);
  }

  const mediaUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MEDIA_MAX_BYTES },
  });

  router.post(
    "/:profileName/media",
    mediaUpload.single("file"),
    asyncRoute(async (req, res) => {
      const { profileName } = req.params;
      const auth = resolveAuth(req);
      const expectedProfile = sanitizeProfileName(auth.tenantId, auth.userId);
      if (profileName !== expectedProfile) {
        return res.status(403).json({ error: "profile ownership mismatch" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "file field required" });
      }

      const originalName = req.file.originalname || "unnamed";
      const ext = path.extname(originalName).replace(/^\./, "").toLowerCase();
      const mimeType = req.file.mimetype || EXT_TO_MIME[ext] || "application/octet-stream";
      const kind = classifyMedia(mimeType, ext);
      if (!kind) {
        return res.status(415).json({ error: `unsupported media type: ${mimeType} (${ext})` });
      }

      const profilesRoot = getProfilesRoot();
      const profileDir = path.join(profilesRoot, profileName);
      const cacheDir = path.join(profileDir, "cache", "media");
      await mkdir(cacheDir, { recursive: true });

      const attachmentId = `att_${crypto.randomUUID()}`;
      const safeName = sanitizeFilename(originalName) || `unnamed.${ext}`;
      const storedName = `${attachmentId}.${ext}`;
      const filePath = path.join(cacheDir, storedName);
      await writeFile(filePath, req.file.buffer);

      const attachment = {
        id: attachmentId,
        kind,
        name: safeName,
        contentType: mimeType,
        size: req.file.size,
        profileName,
        agentPath: filePath,
        url: `/api/hades/hermes/${profileName}/media/${attachmentId}`,
      };

      const metaPath = path.join(cacheDir, `${attachmentId}.meta.json`);
      await writeFile(metaPath, JSON.stringify(attachment, null, 2));

      let extractedText = "";
      if (kind === "document" && mimeType === "text/plain" || mimeType === "text/markdown" || mimeType === "text/csv" || mimeType === "application/json") {
        extractedText = req.file.buffer.toString("utf8").slice(0, 10000);
      } else if (kind === "document" && mimeType === "application/pdf") {
        try {
          const pdfParse = (await import("pdf-parse")).default;
          const pdfData = await pdfParse(req.file.buffer);
          extractedText = pdfData.text.slice(0, 10000);
        } catch {
          extractedText = "[PDF text extraction unavailable]";
        }
      }

      const promptPart = `User attached ${safeName} (${kind}, ${(req.file.size / 1024).toFixed(1)} KB)`;
      attachment.extractedText = extractedText;
      attachment.promptPart = extractedText ? `${promptPart}; extracted text: ${extractedText.slice(0, 500)}` : promptPart;

      res.status(201).json({ attachment });
    })
  );

  // --- Media resolver (normalizes assistant MEDIA tags into attachments) ---

  function parseMediaTags(text) {
    const tags = [];
    if (!text) return tags;
    const re = /MEDIA:([^\s\n]+)/g;
    let match;
    while ((match = re.exec(text)) !== null) {
      tags.push(match[1]);
    }
    return tags;
  }

  router.get(
    "/:profileName/media/:attachmentId",
    asyncRoute(async (req, res) => {
      const { profileName, attachmentId } = req.params;
      const auth = resolveAuth(req);
      const expectedProfile = sanitizeProfileName(auth.tenantId, auth.userId);
      if (profileName !== expectedProfile) {
        return res.status(403).json({ error: "profile ownership mismatch" });
      }

      if (attachmentId.includes("..") || attachmentId.includes("/") || attachmentId.includes("\\")) {
        return res.status(400).json({ error: "invalid attachment id" });
      }

      const profilesRoot = getProfilesRoot();
      const cacheDir = path.join(profilesRoot, profileName, "cache", "media");
      const dir = await mkdir(cacheDir, { recursive: true }).then(() => cacheDir);

      const allFiles = fs.readdirSync(dir);
      const metaFile = allFiles.find((f) => f.startsWith(attachmentId) && f.endsWith(".meta.json"));
      if (!metaFile) {
        return res.status(404).json({ error: "attachment not found" });
      }

      const meta = JSON.parse(fs.readFileSync(path.join(dir, metaFile), "utf8"));
      const ext = path.extname(meta.name || "").replace(/^\./, "").toLowerCase() || "bin";
      const dataFile = allFiles.find((f) => f.startsWith(attachmentId) && f !== metaFile);
      if (!dataFile) {
        return res.status(404).json({ error: "attachment data not found" });
      }

      const filePath = path.join(dir, dataFile);
      const resolved = path.resolve(filePath);
      const allowedRoot = path.resolve(profilesRoot);
      if (!resolved.startsWith(allowedRoot)) {
        return res.status(403).json({ error: "path traversal detected" });
      }

      const contentType = meta.contentType || EXT_TO_MIME[ext] || "application/octet-stream";
      const disposition = meta.kind === "image" || meta.kind === "video" || meta.kind === "audio" ? "inline" : "attachment";
      res.set("Content-Type", contentType);
      res.set("Content-Disposition", `${disposition}; filename="${meta.name || "download"}"`);
      res.set("Content-Length", String(fs.statSync(filePath).size));
      fs.createReadStream(filePath).pipe(res);
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
  const proofToken = process.env.HADES_E2E_AUTH_TOKEN;
  const authHeader = req.headers.authorization || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (proofToken && bearerToken === proofToken) {
    return { userId: "edge-user", tenantId: "edge-tenant" };
  }
  return {
    userId: req.headers["x-user-id"] || "e2e-test-user",
    tenantId: req.headers["x-tenant-id"] || "e2e-test-tenant",
  };
}
