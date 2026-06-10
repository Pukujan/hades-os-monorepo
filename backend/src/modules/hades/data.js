export const VALID_CATEGORIES = ["task", "chat", "shopping", "dev", "fun"];
export const VALID_TRIGGER_TYPES = ["manual", "command", "watcher"];
export const VALID_TARGET_SOCIALS = ["discord", "telegram", "github", "email", "private"];

export const SOCIAL_LINKS = [
  {
    id: "discord",
    provider: "discord",
    displayName: "Discord",
    status: "not_connected",
    commandName: "!sendcatmeme"
  },
  {
    id: "telegram",
    provider: "telegram",
    displayName: "Telegram",
    status: "locked",
    commandName: null
  },
  {
    id: "github",
    provider: "github",
    displayName: "GitHub",
    status: "not_connected",
    commandName: null
  },
  {
    id: "email",
    provider: "email",
    displayName: "Email",
    status: "not_connected",
    commandName: null
  },
  {
    id: "private",
    provider: "private",
    displayName: "Private",
    status: "connected",
    commandName: null
  }
];

export function createEmptyDraft() {
  return {
    name: null,
    description: null,
    category: null,
    targetSocial: null,
    triggerType: null,
    commandName: null,
    action: null,
    responseStyle: "helpful",
    safetyMode: "ask_first",
    testInput: null,
    status: "incomplete"
  };
}

export function missingDraftFields(draft) {
  const missing = [];

  if (!draft?.name) missing.push("name");
  if (!draft?.targetSocial) missing.push("target social");
  if (!draft?.triggerType) missing.push("trigger type");
  if (!draft?.action) missing.push("action");
  if (draft?.triggerType === "command" && !draft?.commandName) missing.push("command name");

  return missing;
}

export function formatSocialLabel(provider) {
  switch (provider) {
    case "discord":
      return "Discord";
    case "telegram":
      return "Telegram";
    case "github":
      return "GitHub";
    case "email":
      return "Email";
    case "private":
      return "Private";
    default:
      return provider;
  }
}

export function getSocialById(id) {
  return SOCIAL_LINKS.find((entry) => entry.id === id) || null;
}

