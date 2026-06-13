function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || "http://127.0.0.1:3001").replace(/\/$/, "");
}

async function requestJson(fetchImpl, baseUrl, route, init = {}) {
  const method = init.method || "GET";
  let response;
  try {
    response = await fetchImpl(`${baseUrl}${route}`, init);
  } catch (error) {
    throw new Error(`${method} ${route} could not reach ${baseUrl}: ${error.message}`);
  }
  const raw = await response.text();
  const body = raw ? JSON.parse(raw) : null;

  if (!response.ok) {
    const message = body?.error || body?.message || raw || `HTTP ${response.status}`;
    throw new Error(`${method} ${route} failed (${response.status}): ${message}`);
  }

  return body;
}

export async function runHadesSmoke({ baseUrl, fetchImpl = fetch, logger = console } = {}) {
  const resolvedBaseUrl = normalizeBaseUrl(baseUrl || process.env.HADES_API_BASE_URL);

  const health = await requestJson(fetchImpl, resolvedBaseUrl, "/api/health");
  const readiness = await requestJson(fetchImpl, resolvedBaseUrl, "/api/hades/readiness");
  const bootstrap = await requestJson(fetchImpl, resolvedBaseUrl, "/api/hades/bootstrap");
  const chat = await requestJson(fetchImpl, resolvedBaseUrl, "/api/hades/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientMessageId: "smoke-chat-1",
      idempotencyKey: "smoke-chat-1",
      message: "Make me a Discord command called !sendcatmeme that sends a random cat meme gif.",
      currentDraft: bootstrap.draft || null
    })
  });
  const testRun = await requestJson(fetchImpl, resolvedBaseUrl, "/api/hades/minions/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      draft: chat.draft,
      idempotencyKey: "smoke-test-1"
    })
  });
  const saved = await requestJson(fetchImpl, resolvedBaseUrl, "/api/hades/minions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      draft: testRun.draft,
      idempotencyKey: "smoke-save-1"
    })
  });
  const assignment = await requestJson(fetchImpl, resolvedBaseUrl, "/api/hades/assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      minionId: saved.minion.id,
      socialLinkId: "discord",
      commandName: saved.minion.commandName || "!sendcatmeme",
      idempotencyKey: "smoke-assign-1"
    })
  });
  const refreshed = await requestJson(fetchImpl, resolvedBaseUrl, "/api/hades/bootstrap");

  logger.log(`health: ${health.status}`);
  logger.log(`readiness: ${readiness.mode}`);
  logger.log(`conversation: ${chat.conversationId || refreshed.conversationId}`);
  logger.log(`minion: ${saved.minion.id}`);
  logger.log(`assignment: ${assignment.assignment.id}`);

  return {
    health,
    readinessMode: readiness.mode,
    conversationId: chat.conversationId || refreshed.conversationId,
    minionId: saved.minion.id,
    assignmentId: assignment.assignment.id,
    refreshed
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runHadesSmoke().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}
