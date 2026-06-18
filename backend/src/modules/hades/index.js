import { createClient } from "@supabase/supabase-js";
import { createHadesRoutes } from "./routes/hades.routes.js";
import { createHadesRepository } from "./repositories/hades.repository.js";
import { createHermesService } from "./services/hermes.service.js";
import { createHermesRuntimeService } from "./services/hermesRuntime.service.js";
import { createHadesService } from "./services/hades.service.js";
import { getHadesConfig } from "./config/index.js";
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

function createSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
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

  const verifySocialAccount = overrides.verifySocialAccount || createVerifySocialAccount({
    discordConnections,
    telegramConnections,
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
  });

  const router = createHadesRoutes({
    service,
    requireHadesAuth: authImpl,
    config,
    scopedRepos,
  });

  app.use("/api/hades", router);

  return {
    detail: "→ /api/hades",
    children: [
      { id: "hades", role: "api", mount: "/api/hades" },
    ]
  };
}
