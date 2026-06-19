export const THEME_CHOICES = [
  {
    id: "ember",
    label: "Ember Forge",
    description: "Default warm forge theme.",
    swatch: "ember"
  },
  {
    id: "arcane",
    label: "Arcane Night",
    description: "Neon purple/blue.",
    swatch: "arcane"
  },
  {
    id: "grove",
    label: "Grove",
    description: "Green nature realm.",
    swatch: "grove"
  }
];

export const MOBILE_NAV = [
  { id: "minions", label: "HADES CHAT", icon: "minions", to: "/app/minions" },
  { id: "forge", label: "MINIONS", icon: "hammer", to: "/forge" },
  { id: "socials", label: "Socials", icon: "socials", to: "/app/socials" },
  { id: "settings", label: "Settings", icon: "settings", to: "/app/settings" }
];

export const STARTER_PROMPTS = [
  { id: "task-helper", label: "Task helper", icon: "task", text: "Make a private helper that turns messy notes into task cards" },
  { id: "chat-summarizer", label: "Chat summarizer", icon: "chat", text: "Make a bot that summarizes long chats" },
  { id: "github-packet", label: "GitHub packet", icon: "github", text: "Make a GitHub task packet helper for repo work" },
  { id: "cat-memes", label: "Cat memes", icon: "cat", text: "I want a command called !sendcat that sends cat memes in Discord" }
];

export const LOCKED_PREVIEWS = [
  {
    id: "marketplace",
    icon: "market",
    title: "Marketplace locked",
    description: "Creator minions, rent/buy, credits, and skins come later."
  },
  {
    id: "skins",
    icon: "locked",
    title: "Skins locked",
    description: "Profile cards and skins are preview-only for MVP."
  }
];

export const SOCIAL_LINKS = [
  {
    id: "discord",
    provider: "discord",
    displayName: "Discord",
    status: "not_connected",
    commandName: "!sendcat"
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
    id: "instagram",
    provider: "instagram",
    displayName: "Instagram",
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

export function normalizeMinion(minion) {
  if (!minion) return null;
  const isMock = "destinationProvider" in minion || "triggerType" in minion;
  const isStarter = "targetSocial" in minion && "destination" in minion && typeof minion.destination === "object";
  const kind = minion.type === "auto" ? "auto" : minion.type === "manual" ? "manual" : "system";
  return {
    id: minion.id || "",
    name: minion.name || "Unnamed",
    title: minion.title || minion.description || "",
    emoji: minion.emoji || "",
    description: minion.description || "",
    status: minion.slotIndex != null ? "active" : "inactive",
    command: isMock ? (minion.command || "") : isStarter ? (minion.commandName || "") : "",
    summon: isMock ? (minion.command || "") : isStarter ? (minion.commandName || "") : "",
    destination: isMock ? (minion.destination || "") : isStarter ? (minion.destination?.channelName || formatSocialLabel(minion.targetSocial)) : "",
    schedule: minion.interval || minion.schedule || (minion.triggerType === "automatic" ? "auto" : null),
    kind,
    preview: null,
    logs: [],
    technicalDetails: null,
  };
}

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

export function createInitialInbox() {
  return [
    {
      id: "welcome",
      icon: "sparkles",
      title: "Hades is ready",
      description: "Start by describing a minion naturally. Hades will fill in the draft.",
      status: "info"
    },
    {
      id: "marketplace-lock",
      icon: "market",
      title: "Marketplace locked",
      description: "Creator minions, credits, and rentals are preview-only in MVP.",
      status: "locked"
    }
  ];
}

export function createInitialMessages() {
  return [
    {
      id: "welcome-assistant",
      role: "assistant",
      content:
        "Hades is listening. Speak, ask, or choose a door.",
      status: "completed"
    }
  ];
}

export function formatSocialLabel(provider) {
  switch (provider) {
    case "discord":
      return "Discord";
    case "telegram":
      return "Telegram";
    case "github":
      return "GitHub";
    case "instagram":
      return "Instagram";
    case "email":
      return "Email";
    case "private":
      return "Private";
    default:
      return provider;
  }
}

export function getSocialIcon(provider) {
  switch (provider) {
    case "discord":
      return "discord";
    case "telegram":
      return "telegram";
    case "github":
      return "github";
    case "instagram":
      return "instagram";
    case "email":
      return "email";
    case "private":
      return "private";
    default:
      return "socials";
  }
}
