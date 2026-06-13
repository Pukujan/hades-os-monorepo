function extractBearerToken(headers) {
  if (!headers) return null;
  const authorization = headers.authorization || headers.Authorization || null;
  if (authorization && /^Bearer\s+/i.test(authorization)) {
    return authorization.replace(/^Bearer\s+/i, "").trim();
  }
  return null;
}

export async function requireHadesAuth(req, { supabaseAuth } = {}) {
  const sessionToken = extractBearerToken(req.headers);

  if (!sessionToken) {
    throw Object.assign(new Error("Missing authentication"), { code: "missing_auth" });
  }

  const user = await supabaseAuth.getUserFromToken(sessionToken);

  if (!user || !user.id) {
    throw Object.assign(new Error("Invalid authentication"), { code: "invalid_auth" });
  }

  const userId = user.id;
  const tenantId = user.app_metadata?.tenant_id || userId;

  return {
    userId,
    tenantId,
    sessionToken,
  };
}
