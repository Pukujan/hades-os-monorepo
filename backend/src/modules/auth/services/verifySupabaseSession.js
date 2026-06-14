const DEFAULT_SUPABASE_AUTH_PATH = "/auth/v1/user";

function normalizeBaseUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

function getHeader(headers, name) {
  if (!headers || typeof headers !== "object") return null;
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (String(key).toLowerCase() === target) {
      return typeof value === "string" ? value : Array.isArray(value) ? value[0] : null;
    }
  }
  return null;
}

function extractBearerToken(headers) {
  const authorization = getHeader(headers, "authorization");
  if (authorization && /^Bearer\s+/i.test(authorization)) {
    const token = authorization.replace(/^Bearer\s+/i, "").trim();
    if (token) return token;
  }

  const cookie = getHeader(headers, "cookie");
  if (!cookie) return null;

  const match = cookie.match(/(?:^|;\s*)sb-access-token=([^;]+)/i);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function extractDiscordAccountId(user) {
  const identities = Array.isArray(user?.identities) ? user.identities : [];
  const discordIdentity = identities.find((identity) => identity?.provider === "discord") || identities[0] || null;
  const identityData = discordIdentity?.identity_data || discordIdentity?.identityData || {};
  return (
    discordIdentity?.provider_id ||
    discordIdentity?.id ||
    identityData.sub ||
    identityData.id ||
    identityData.user_id ||
    null
  );
}

function buildTenantId(userId) {
  return `tenant_${userId}`;
}

export async function verifySupabaseSession(
  headers,
  {
    fetchImpl = globalThis.fetch,
    supabaseUrl = process.env.SUPABASE_URL,
    supabaseAnonKey = process.env.SUPABASE_ANON_KEY,
    authPath = DEFAULT_SUPABASE_AUTH_PATH
  } = {}
) {
  const accessToken = extractBearerToken(headers);
  if (!accessToken) {
    return null;
  }

  const baseUrl = normalizeBaseUrl(supabaseUrl);
  if (!baseUrl || !supabaseAnonKey || typeof fetchImpl !== "function") {
    return null;
  }

  const response = await fetchImpl(`${baseUrl}${authPath}`, {
    method: "GET",
    headers: {
      apikey: supabaseAnonKey,
      authorization: `Bearer ${accessToken}`,
      accept: "application/json"
    }
  });

  if (!response?.ok) {
    console.warn(`[auth] Supabase session verification failed: ${response?.status} ${response?.statusText}`);
    return null;
  }

  const user = await response.json();
  if (!user?.id) {
    console.warn("[auth] Supabase response missing user.id");
    return null;
  }

  const provider =
    user?.app_metadata?.provider ||
    user?.identities?.[0]?.provider ||
    "discord";

  return {
    id: user.id,
    userId: user.id,
    tenantId: buildTenantId(user.id),
    email: typeof user.email === "string" ? user.email : null,
    provider,
    discordAccountId: extractDiscordAccountId(user),
    role: typeof user.role === "string" ? user.role : "authenticated"
  };
}
