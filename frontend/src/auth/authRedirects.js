const DEFAULT_LOGIN_REDIRECT = "/app";

export function getAfterLoginUrl(location) {
  const loc = location || (typeof window !== "undefined" ? window.location : null);
  if (!loc) return DEFAULT_LOGIN_REDIRECT;

  const params = new URLSearchParams(loc.search || "");
  const redirectParam = params.get("redirect");
  if (redirectParam) return redirectParam;

  const { pathname } = loc;
  if (pathname && pathname.startsWith(DEFAULT_LOGIN_REDIRECT)) return pathname;

  return DEFAULT_LOGIN_REDIRECT;
}

export function buildOAuthRedirectTo(location) {
  const loc = location || (typeof window !== "undefined" ? window.location : null);
  const origin = loc?.origin || "";
  return `${origin}${getAfterLoginUrl(loc)}`;
}
