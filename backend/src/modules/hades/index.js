import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { createHadesRoutes } from "./routes/hades.routes.js";
import { createHermesSessionRoutes } from "./routes/hermes.routes.js";
import { createHadesRepository } from "./repositories/hades.repository.js";
import { createHermesService } from "./services/hermes.service.js";
import { createHermesRuntimeService } from "./services/hermesRuntime.service.js";
import { createHadesService } from "./services/hades.service.js";
import { getHadesConfig } from "./config/index.js";
import { createHermesWorkspaceService } from "./runtime/hermesWorkspace.js";
import { createHermesStateStore } from "./runtime/hermesStateStore.js";
import { createHermesStateRepository } from "./repositories/hermesStateRepository.js";
import { createHermesRoutingTokenService } from "./runtime/hermesRoutingToken.js";
import { createHermesCapabilityEnvelope } from "./runtime/hermesCapabilityEnvelope.js";
import { createHermesProcessManager } from "./runtime/hermesProcessManager.js";
import { createHermesObjectStore } from "./runtime/hermesObjectStore.js";
import { createHermesFilesystem } from "./runtime/hermesFilesystem.js";
import { createHermesRuntimeSpawner } from "./runtime/hermesRuntimeSpawn.js";
import { createHermesArtifactStore } from "./runtime/hermesArtifactStore.js";
import { createHermesBoundaryActionBroker } from "./runtime/hermesBoundaryActionBroker.js";
import { createHermesProfileRegistry } from "./runtime/hermesProfileRegistry.js";
import { createHermesProfileRouter } from "./runtime/hermesProfileRouter.js";
import { createHermesProfileProvisioner } from "./runtime/hermesProfileProvisioner.js";
import { createHermesProfileSessionBroker } from "./runtime/hermesProfileSessionBroker.js";
import { createHermesProfileGatewayProcessManager } from "./runtime/hermesProfileGatewayProcessManager.js";
import { createHermesEdgeAuthProxy } from "./runtime/hermesEdgeAuthProxy.js";
import { createHermesProfileStatePersistence } from "./runtime/hermesProfileStatePersistence.js";
import net from "node:net";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { createDiscordHermesCommandFlow } from "./services/discordHermesCommandFlow.service.js";
import { createMinionAssignmentRuntime } from "./services/minionAssignmentRuntime.service.js";
import { createGiphyProvider } from "./services/giphyProvider.service.js";
import { createMediaUrlVerifier } from "./services/mediaUrlVerifier.js";
import { createBotTokenProvider } from "./services/botTokenProvider.js";
import { requireHadesAuth } from "../auth/services/authMiddleware.js";
import { createMinionRepository } from "./repositories/minionRepository.js";
import { createAssignmentRepository } from "./repositories/assignmentRepository.js";
import { createConversationRepository } from "./repositories/conversationRepository.js";
import { createTelegramConnectionRepository } from "./repositories/telegramConnectionRepository.js";
import { createDiscordConnectionRepository } from "./repositories/discordConnectionRepository.js";
import { createGitHubConnectionRepository } from "./repositories/gitHubConnectionRepository.js";
import { createSlackConnectionRepository } from "./repositories/slackConnectionRepository.js";
import { createInstagramConnectionRepository } from "./repositories/instagramConnectionRepository.js";
import { createAgentExecutionRepository } from "./repositories/agentExecutionRepository.js";
import { createMemoryRecordRepository } from "./repositories/memoryRecordRepository.js";
import { createExtensionKeyRepository } from "./workflows/extensionKeyRepository.js";
import { createWorkflowRepository } from "./workflows/workflowRepository.js";
import { createProcessedUpdateRepository } from "./repositories/processedUpdateRepository.js";
import { createTelegramConversationModeRepository } from "./repositories/telegramConversationModeRepository.js";
import { createVerifySocialAccount } from "./runtime/verifySocialAccount.js";
import { createTokenCrypto } from "./security/tokenCrypto.js";
import { createDocumentRepository } from "./repositories/documentRepository.js";
import { createContextSpaceRepository } from "./repositories/contextSpaceRepository.js";
import { createPageCaptureRepository } from "./repositories/pageCaptureRepository.js";
import { createApprovalRepository } from "./repositories/approvalRepository.js";
import { createToolRegistry } from "./workflows/toolRegistry.js";
import { createWorkflowOrchestrator } from "./workflows/workflowOrchestrator.js";
import { createDurableWorkflowOrchestrator } from "./workflows/durableWorkflowOrchestrator.js";
import { createWorkflowRunStateRepository } from "./workflows/workflowRunStateRepository.js";
import { createWorkflowRecoveryService } from "./workflows/workflowRecoveryService.js";
import { createWorkflowAuditRepository } from "./workflows/workflowAuditRepository.js";
import { createMemoryDocumentTools } from "./workflows/memoryDocumentTools.js";
import { createJobApplicationPlanner } from "./workflows/jobApplicationPlanner.js";
import { createExternalAdapterRegistry } from "./workflows/externalAdapterRegistry.js";
import { createBrowserExtensionContract } from "./workflows/browserExtensionContract.js";
import { createVoiceService } from "./services/voice.service.js";

function createSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function verifySupabaseJwt(supabaseClient, jwt) {
  if (!jwt || !supabaseClient) {
    return { userId: "anonymous", tenantId: "anonymous" };
  }
  try {
    const { data, error } = await supabaseClient.auth.getUser(jwt);
    if (error || !data?.user) {
      return { userId: "anonymous", tenantId: "anonymous" };
    }
    const userId = data.user.id;
    const tenantId = data.user.email?.split("@")[1]?.replace(/\./g, "_") || "default";
    return { userId, tenantId };
  } catch {
    return { userId: "anonymous", tenantId: "anonymous" };
  }
}

export async function register(app, context) {
  const overrides = context?.overrides || {};
  const config = getHadesConfig();
  const repository = createHadesRepository();
  const hermesRuntime = overrides.runtimeService || createHermesRuntimeService();
  const mediaVerifier = overrides.mediaVerifier || createMediaUrlVerifier();
  const hermes = createHermesService({ hermesRuntime, mediaVerifier });

  const supabaseConfigured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  const supabaseClient = overrides.supabaseClient || (supabaseConfigured ? createSupabaseClient() : null);
  const storageMode = supabaseClient ? "supabase" : "memory";

  const hermesHomeDir = process.env.HERMES_HOME || path.join(process.cwd(), ".hermes-home");
  const hermesWorkspace = createHermesWorkspaceService({ homeDir: hermesHomeDir });
  const hermesStateRepository = overrides.hermesStateRepository || createHermesStateRepository({ storage: storageMode, supabaseClient });
  const hermesObjectStore = overrides.hermesObjectStore || createHermesObjectStore({ mode: storageMode, supabaseClient, bucket: "hermes-artifacts" });
  const hermesFilesystem = overrides.hermesFilesystem || createHermesFilesystem({ homeDir: hermesHomeDir });
  const hermesArtifactStore = overrides.hermesArtifactStore || createHermesArtifactStore({ objectStore: hermesObjectStore, defaultTtlSeconds: 3600 });
  const hermesRoutingTokenService = overrides.hermesRoutingTokenService || createHermesRoutingTokenService({
    secret: process.env.HERMES_ROUTING_SECRET || "dev-routing-secret",
    repository: hermesStateRepository,
  });
  const hermesCapabilityEnvelope = overrides.hermesCapabilityEnvelope || createHermesCapabilityEnvelope({});
  const hermesBoundaryActionBroker = overrides.hermesBoundaryActionBroker || createHermesBoundaryActionBroker({
    capabilityEnvelope: hermesCapabilityEnvelope,
    routingTokenService: hermesRoutingTokenService,
  });

  const hermesProfileRegistry = overrides.hermesProfileRegistry || createHermesProfileRegistry({
    storage: storageMode,
    supabaseClient,
  });
  const hermesProfileRouter = overrides.hermesProfileRouter || createHermesProfileRouter({
    publicBaseUrl: process.env.HERMES_PUBLIC_BASE_URL || "/api/hades/hermes",
    registry: hermesProfileRegistry,
  });
  const hermesProfilesRoot = process.env.HERMES_PROFILES_ROOT || path.join(hermesHomeDir, "profiles");
  const hermesProfileProvisioner = overrides.hermesProfileProvisioner || createHermesProfileProvisioner({
    hermesBin: process.env.HERMES_BIN_PATH || "hermes",
    profilesRoot: hermesProfilesRoot,
    serverEnv: { GROQ_API_KEY: process.env.GROQ_API_KEY },
    run: async (command) => {
      const { execSync } = await import("node:child_process");
      return execSync(command, {
        encoding: "utf8",
        stdio: "pipe",
        env: { ...process.env, ...(hermesHomeDir ? { HERMES_HOME: hermesHomeDir } : {}) },
      });
    },
    writeFile: async (filePath, content) => {
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, content, "utf8");
    },
    allocatePort: async () => {
      return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(0, "127.0.0.1", () => {
          const port = server.address().port;
          server.close(() => resolve(port));
        });
        server.on("error", reject);
      });
    },
    generateApiServerKey: () => crypto.randomBytes(32).toString("hex"),
  });
  const hermesProfileStatePersistence = overrides.hermesProfileStatePersistence || createHermesProfileStatePersistence({
    platform: process.env.HADES_PLATFORM || "local",
    profilesRoot: process.env.HERMES_PROFILES_ROOT || path.join(hermesHomeDir, "profiles"),
    railwayVolumeMountPath: process.env.RAILWAY_VOLUME_MOUNT_PATH || "",
    filesystem: hermesFilesystem,
    objectStore: hermesObjectStore,
  });
  const hermesAuth = overrides.hermesAuth || {
    verifySupabaseJwt: async (jwt) => verifySupabaseJwt(supabaseClient, jwt),
  };
  const hermesProfileGatewayProcessManager = overrides.hermesProfileGatewayProcessManager || createHermesProfileGatewayProcessManager({
    hermesBin: process.env.HERMES_BIN_PATH || "hermes",
    hermesHome: hermesHomeDir,
    env: process.env,
    spawn,
    healthTimeoutMs: process.env.HERMES_PROFILE_GATEWAY_HEALTH_TIMEOUT_MS,
    healthPollMs: process.env.HERMES_PROFILE_GATEWAY_HEALTH_POLL_MS,
  });
  const hermesProfileSessionBroker = overrides.hermesProfileSessionBroker || createHermesProfileSessionBroker({
    auth: hermesAuth,
    profileRegistry: (() => {
      const profileCache = new Map();
      return {
        ensureProfile: async ({ userId, tenantId, model, provider }) => {
          const cacheKey = `${tenantId}_${userId}`;
          const cached = profileCache.get(cacheKey);
          if (cached) return cached;

          const existing = await hermesProfileRegistry.findProfile({ tenantId, userId });
          if (existing) {
            const apiServerKey = await hermesProfileRegistry.getApiServerKey({ profileName: existing.profileName });
            if (apiServerKey) {
              const profile = {
                ...existing,
                apiBaseUrl: `http://${existing.apiHost}:${existing.apiPort}`,
                profileName: existing.profileName,
                gatewayStatus: "registered",
              };
              Object.defineProperty(profile, "apiServerKey", { value: apiServerKey, enumerable: false, configurable: false, writable: false });
              profileCache.set(cacheKey, profile);
              return profile;
            }
          }

          const provisioned = await hermesProfileProvisioner.ensureProfile({ userId, tenantId, model, provider });
          const registered = await hermesProfileRegistry.upsertProfile({
            tenantId,
            userId,
            profileName: provisioned.profileName,
            apiHost: "127.0.0.1",
            apiPort: parseInt(provisioned.apiBaseUrl.split(":")[2], 10) || 8657,
            edgeBaseUrl: `${process.env.HERMES_PUBLIC_BASE_URL || "/api/hades/hermes"}/${provisioned.profileName}/v1`,
            apiServerKey: provisioned.apiServerKey,
            gatewayStatus: "provisioned",
          });
          const profile = { ...provisioned, ...registered, profileName: provisioned.profileName };
          Object.defineProperty(profile, "apiServerKey", { value: provisioned.apiServerKey, enumerable: false, configurable: false, writable: false });
          profileCache.set(cacheKey, profile);
          return profile;
        },
      };
    })(),
    profileRouter: hermesProfileRouter,
    routingToken: hermesRoutingTokenService,
    profileGatewayManager: hermesProfileGatewayProcessManager,
  });
  const hermesStateStore = overrides.hermesStateStore || createHermesStateStore({
    objectStore: hermesObjectStore,
    filesystem: hermesFilesystem,
    repository: hermesStateRepository,
  });
  const hermesRuntimeSpawner = overrides.hermesRuntimeSpawner || createHermesRuntimeSpawner({
    hermesRuntimeServiceFactory: () => hermesRuntime,
  });
  const hermesProcessManager = overrides.hermesProcessManager || createHermesProcessManager({
    workspaceService: hermesWorkspace,
    stateStore: hermesStateStore,
    routing: hermesRoutingTokenService,
    spawnRuntime: hermesRuntimeSpawner.spawnRuntime,
    artifactStore: hermesArtifactStore,
  });

  let tokenCrypto = null;
  if (overrides.crypto) {
    tokenCrypto = overrides.crypto;
  } else if (process.env.ENCRYPTION_KEY) {
    try {
      tokenCrypto = createTokenCrypto({ encryptionKey: process.env.ENCRYPTION_KEY });
    } catch { tokenCrypto = null; }
  }

  let giphyProvider = null;
  try {
    giphyProvider = config.giphyApiKey ? createGiphyProvider({ apiKey: config.giphyApiKey }) : null;
  } catch { giphyProvider = null; }

  const telegramWebhookBaseUrl = process.env.TELEGRAM_WEBHOOK_BASE_URL || null;

  const botTokenProvider = createBotTokenProvider({
    findSocialConnection: async () => null,
  });

  const minions = overrides.minions || createMinionRepository({ storage: storageMode, supabaseClient });
  const assignments = overrides.assignments || createAssignmentRepository({ storage: storageMode, supabaseClient });
  const conversations = overrides.conversations || createConversationRepository({ storage: storageMode, supabaseClient });
  const telegramConnections = overrides.telegramConnections || createTelegramConnectionRepository({ storage: storageMode, supabaseClient, crypto: tokenCrypto });
  const discordConnections = overrides.discordConnections || createDiscordConnectionRepository({ storage: storageMode, supabaseClient, crypto: tokenCrypto });
  const gitHubConnections = overrides.gitHubConnections || createGitHubConnectionRepository({ storage: storageMode, supabaseClient, crypto: tokenCrypto });
  const slackConnections = overrides.slackConnections || createSlackConnectionRepository({ storage: storageMode, supabaseClient, crypto: tokenCrypto });
  const instagramConnections = overrides.instagramConnections || createInstagramConnectionRepository({ storage: storageMode, supabaseClient });
  const executions = overrides.executions || createAgentExecutionRepository({ storage: storageMode, supabaseClient });
  const processedUpdates = overrides.processedUpdates || createProcessedUpdateRepository({ storage: storageMode, supabaseClient });
  const conversationModes = overrides.conversationModes || createTelegramConversationModeRepository({ storage: storageMode, supabaseClient });
  const memoryRecords = overrides.memoryRecords || createMemoryRecordRepository({ storage: storageMode, supabaseClient });
  const extensionKeys = overrides.extensionKeys || createExtensionKeyRepository({ storage: storageMode, supabaseClient });
  const workflowDefinitions = overrides.workflowDefinitions || createWorkflowRepository({ storage: storageMode, supabaseClient });
  const extensionDocuments = overrides.extensionDocuments || createDocumentRepository({ storage: storageMode, supabaseClient });
  const extensionContextSpaces = overrides.extensionContextSpaces || createContextSpaceRepository({ storage: storageMode, supabaseClient });
  const extensionPageCaptures = overrides.extensionPageCaptures || createPageCaptureRepository({ storage: storageMode, supabaseClient });
  const extensionApprovals = overrides.extensionApprovals || createApprovalRepository({ storage: storageMode, supabaseClient });

  const toolRegistry = overrides.toolRegistry || createToolRegistry();
  const workflowRunStateRepo = overrides.workflowRunStateRepo || createWorkflowRunStateRepository({ storage: storageMode, supabaseClient });
  const workflowAuditRepo = overrides.workflowAuditRepo || createWorkflowAuditRepository();
  const memoryDocumentTools = overrides.memoryDocumentTools || createMemoryDocumentTools({});
  const browserExtensionContract = overrides.browserExtensionContract || createBrowserExtensionContract();
  const externalAdapterRegistry = overrides.externalAdapterRegistry || createExternalAdapterRegistry({});
  const jobApplicationPlanner = overrides.jobApplicationPlanner || createJobApplicationPlanner();

  toolRegistry.registerMany(memoryDocumentTools);
  toolRegistry.registerMany(externalAdapterRegistry.listToolDefinitions());

  const hermesPlanner = overrides.hermesPlanner || {
    async plan({ workflow, input }) {
      const toolCalls = (workflow.allowedTools || []).map((toolName) => ({
        id: randomUUID(),
        toolName,
        input: { message: input?.message || "", workflowId: workflow.id },
      }));
      return { toolCalls };
    },
  };

  const workflowOrchestrator = overrides.workflowOrchestrator || createWorkflowOrchestrator({
    hermesPlanner,
    toolRegistry,
    approvalRepository: extensionApprovals,
    auditRepository: workflowAuditRepo,
  });

  const durableWorkflowOrchestrator = overrides.durableWorkflowOrchestrator || createDurableWorkflowOrchestrator({
    runStateRepository: workflowRunStateRepo,
    planner: hermesPlanner,
    toolRegistry,
    approvalRepository: extensionApprovals,
  });

  const workflowRecoveryService = overrides.workflowRecoveryService || createWorkflowRecoveryService({
    runStateRepository: workflowRunStateRepo,
  });

  const verifySocialAccount = overrides.verifySocialAccount || createVerifySocialAccount({
    discordConnections,
    telegramConnections,
    slackConnections,
  });

  const runtimeHermes = overrides.hermesRuntime || hermesRuntime;
  const runtimeSocialClient = overrides.socialClient || null;

  const scopedRepos = {
    minions,
    assignments,
    conversations,
    telegramConnections,
    discordConnections,
    gitHubConnections,
    slackConnections,
    instagramConnections,
    executions,
    processedUpdates,
    conversationModes,
    memoryRecords,
    extensionKeys,
    workflowDefinitions,
    extensionDocuments,
    extensionContextSpaces,
    extensionPageCaptures,
    extensionApprovals,
    verifySocialAccount,
    toolRegistry,
    workflowOrchestrator,
    durableWorkflowOrchestrator,
    workflowRunStateRepo,
    workflowRecoveryService,
    workflowAuditRepo,
    memoryDocumentTools,
    browserExtensionContract,
    externalAdapterRegistry,
    jobApplicationPlanner,
    hermesPlanner,
  };

  const minionAssignmentRuntime = createMinionAssignmentRuntime({
    verifySocialAccount,
    repository,
    hermesRuntime: runtimeHermes,
    socialClient: runtimeSocialClient,
    scopedRepos,
  });

  const authImpl = overrides.auth?.requireHadesAuth || requireHadesAuth;

  const service = createHadesService({
    repository,
    scopedRepos,
    hermes,
    config,
    minionAssignmentRuntime,
    context,
    telegramClientFactory: overrides.telegramClientFactory || null,
    hermesRuntime,
    telegramWebhookBaseUrl,
    gifProvider: giphyProvider,
  });

  const router = createHadesRoutes({
    service,
    requireHadesAuth: authImpl,
    config,
    scopedRepos,
  });

  app.use("/api/hades", router);

  const hermesEdgeAuthProxyObj = overrides.hermesEdgeAuthProxy || createHermesEdgeAuthProxy({
    auth: {
      verifyEdgeRequest: async ({ headers, profileName }) => {
        const proofToken = process.env.HADES_E2E_AUTH_TOKEN;
        const auth = headers?.authorization || "";
        if (proofToken && auth === `Bearer ${proofToken}`) {
          return { userId: "edge-user", tenantId: "edge-tenant", profileName };
        }
        const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : null;
        const identity = await verifySupabaseJwt(supabaseClient, jwt);
        if (!identity.userId || identity.userId === "anonymous") {
          const xUserId = headers["x-user-id"] || "anonymous";
          const xTenantId = headers["x-tenant-id"] || "anonymous";
          return { userId: xUserId, tenantId: xTenantId, profileName };
        }
        return { userId: identity.userId, tenantId: identity.tenantId, profileName };
      },
    },
    profileRouter: hermesProfileRouter,
    apiServerKeyVault: hermesProfileRegistry,
    fetch: globalThis.fetch,
  });

  const voiceService = createVoiceService();

  const hermesMgrRouter = createHermesSessionRoutes({
    config,
    processManager: hermesProcessManager,
    stateRepository: hermesStateRepository,
    profileSessionBroker: hermesProfileSessionBroker,
    profileRegistry: hermesProfileRegistry,
    profileStatePersistence: hermesProfileStatePersistence,
    hermesFilesystem,
    edgeAuthProxy: hermesEdgeAuthProxyObj,
    profileProvisioner: hermesProfileProvisioner,
    voiceService,
  });

  const hermesMountPath = "/api/hades/hermes";
  app.use(hermesMountPath, hermesMgrRouter);

  return {
    detail: "→ /api/hades",
    children: [
      { id: "hades", role: "api", mount: "/api/hades" },
    ]
  };
}
