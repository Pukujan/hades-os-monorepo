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
  { id: "home", label: "Home", icon: "home", to: "/app/home" },
  { id: "minions", label: "Minions", icon: "minions", to: "/app/minions" },
  { id: "socials", label: "Socials", icon: "socials", to: "/app/socials" },
  { id: "inbox", label: "Inbox", icon: "inbox", to: "/app/inbox" },
  { id: "settings", label: "Me", icon: "settings", to: "/app/settings" }
];

export const STARTER_PROMPTS = [
  { id: "task-helper", label: "Task helper", icon: "task", text: "Make a private helper that turns messy notes into task cards" },
  { id: "chat-summarizer", label: "Chat summarizer", icon: "chat", text: "Make a bot that summarizes long chats" },
  { id: "github-packet", label: "GitHub packet", icon: "github", text: "Make a GitHub task packet helper for repo work" },
  { id: "cat-memes", label: "Cat memes", icon: "cat", text: "I want a command called !sendcat that sends cat memes in Discord" }
];

export const STARTER_MINIONS = [
  {
    id: "task-helper",
    icon: "task",
    name: "Task Helper",
    description: "Turns messy instructions into simple task cards.",
    category: "task",
    triggerType: "manual",
    commandName: null,
    status: "active",
    targetSocial: "private"
  },
  {
    id: "chat-summarizer",
    icon: "chat",
    name: "Chat Summarizer",
    description: "Summarizes long chats into clean notes.",
    category: "chat",
    triggerType: "manual",
    commandName: null,
    status: "locked",
    targetSocial: "private"
  },
  {
    id: "deal-watcher",
    icon: "shopping",
    name: "Deal Watcher",
    description: "Finds discounts and price drops. Locked.",
    category: "shopping",
    triggerType: "watcher",
    commandName: null,
    status: "locked",
    targetSocial: "private"
  }
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
        "Tell me what kind of minion you want. You can say it directly, like: “I want a command to send cat memes in Discord.”",
      status: "completed"
    }
  ];
}

export function createStarterOwnedMinions(now = new Date().toISOString()) {
  return [
    {
      id: "task-helper",
      userId: "local-user",
      icon: "task",
      name: "Task Helper",
      description: "Turns messy notes into clean task cards.",
      instructions: "Turn messy notes into clean task cards.",
      category: "task",
      triggerType: "manual",
      commandName: null,
      status: "active",
      targetSocial: "private",
      createdAt: now,
      updatedAt: now
    }
  ];
}

export function deriveLevelState(minionCount) {
  const hasFirstSave = minionCount > 1;

  return {
    id: "local-level",
    userId: "local-user",
    level: hasFirstSave ? 2 : 1,
    title: hasFirstSave ? "Helper Tamer" : "New Summoner",
    xp: hasFirstSave ? 78 : 42,
    nextLevelXp: hasFirstSave ? 200 : 100,
    completedMilestones: hasFirstSave ? ["first_saved_minion"] : [],
    unlockedFeatures: hasFirstSave ? ["second_minion_slot"] : ["second_minion_slot_preview"],
    createdAt: "2026-06-10T00:00:00.000Z",
    updatedAt: new Date().toISOString()
  };
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

export function getSocialIcon(provider) {
  switch (provider) {
    case "discord":
      return "discord";
    case "telegram":
      return "telegram";
    case "github":
      return "github";
    case "email":
      return "email";
    case "private":
      return "private";
    default:
      return "socials";
  }
}
