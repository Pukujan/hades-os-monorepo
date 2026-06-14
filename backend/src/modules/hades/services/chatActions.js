const ALLOWED_ROUTES = new Set([
  "/app/minions",
  "/app/forge",
  "/app/socials",
  "/app/settings",
]);

const ROUTE_ALIASES = {
  "/forge": "/app/forge",
  "/minions": "/app/minions",
  "/socials": "/app/socials",
  "/settings": "/app/settings",
};

const ALLOWED_COMMANDS = new Set([
  "test_integration",
  "open_integration_setup",
]);

function cleanLabel(label) {
  return String(label || "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 48);
}

function normalizeRoute(route) {
  const raw = String(route || "").trim();
  return ROUTE_ALIASES[raw] || raw;
}

function isSafeHttpsUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeChatActions(actions = []) {
  if (!Array.isArray(actions)) return [];

  return actions
    .map((action) => {
      if (!action || typeof action !== "object") return null;

      const label = cleanLabel(action.label);
      if (!label) return null;

      if (action.type === "route") {
        const to = normalizeRoute(action.to || action.route);
        if (!ALLOWED_ROUTES.has(to)) return null;

        return {
          type: "route",
          label,
          to,
        };
      }

      if (action.type === "external_link") {
        const url = String(action.url || "").trim();
        if (!isSafeHttpsUrl(url)) return null;

        return {
          type: "external_link",
          label,
          url,
        };
      }

      if (action.type === "command") {
        const command = String(action.command || "").trim();
        if (!ALLOWED_COMMANDS.has(command)) return null;

        return {
          type: "command",
          label,
          command,
          payload:
            action.payload && typeof action.payload === "object"
              ? action.payload
              : {},
        };
      }

      return null;
    })
    .filter(Boolean)
    .slice(0, 3);
}
