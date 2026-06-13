function pickPrompt(body) {
  if (!body || typeof body !== "object") return "";
  return typeof body.prompt === "string" ? body.prompt : "";
}

function sanitizeHermesInput(body) {
  return {
    prompt: pickPrompt(body)
  };
}

export async function createHermesJobFromRequest({
  headers = {},
  body = {},
  verifySupabaseSession,
  createHermesJob
}) {
  try {
    const session = await verifySupabaseSession(headers);
    if (!session) {
      return {
        status: 401,
        body: {
          error: "UNAUTHENTICATED"
        }
      };
    }

    const job = await createHermesJob({
      userId: session.userId,
      tenantId: session.tenantId,
      discordAccountId: session.discordAccountId,
      authProvider: session.provider,
      input: sanitizeHermesInput(body)
    });

    return {
      status: 202,
      body: job
    };
  } catch {
    return {
      status: 401,
      body: {
        error: "UNAUTHENTICATED"
      }
    };
  }
}
