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
  { id: "minions", label: "Minions", icon: "minions", to: "/app/minions" },
  { id: "forge", label: "Forge", icon: "hammer", to: "/forge" },
  { id: "socials", label: "Socials", icon: "socials", to: "/app/socials" },
  { id: "settings", label: "Settings", icon: "settings", to: "/app/settings" }
];

export const STARTER_PROMPTS = [
  { id: "task-helper", label: "Task helper", icon: "task", text: "Make a private helper that turns messy notes into task cards" },
  { id: "chat-summarizer", label: "Chat summarizer", icon: "chat", text: "Make a bot that summarizes long chats" },
  { id: "github-packet", label: "GitHub packet", icon: "github", text: "Make a GitHub task packet helper for repo work" },
  { id: "cat-memes", label: "Cat memes", icon: "cat", text: "I want a command called !sendcat that sends cat memes in Discord" }
];

export const STARTER_MINIONS = [
  {
    id: "cat-courier",
    avatar: "🔥",
    icon: "cat",
    name: "Cat Courier",
    description: "Manual summon · Discord + chat",
    category: "discord",
    triggerType: "manual",
    commandName: "!sendcat",
    status: "active",
    targetSocial: "discord",
    destination: {
      provider: "discord",
      channelName: "#cat-chaos"
    }
  },
  {
    id: "price-imp",
    avatar: "🪙",
    icon: "shopping",
    name: "Price Imp",
    description: "Automatic · every 5 hours",
    category: "shopping",
    triggerType: "automatic",
    commandName: "price tracker <product link> <target price>",
    status: "active",
    targetSocial: "email",
    destination: {
      provider: "gmail",
      channelName: "Gmail alert"
    }
  },
  {
    id: "scroll-reader",
    avatar: "📜",
    icon: "chat",
    name: "Scroll Reader",
    description: "Needs approval before sending",
    category: "chat",
    triggerType: "manual",
    commandName: "!summarize <how much detail>",
    status: "active",
    targetSocial: "email",
    destination: {
      provider: "gmail",
      channelName: "Gmail draft"
    }
  },
  {
    id: "episode-watcher",
    avatar: "📺",
    icon: "sparkles",
    name: "Episode Watcher",
    description: "Automatic · nightly scan",
    category: "watchlist",
    triggerType: "watcher",
    commandName: "track episode <show name>",
    status: "active",
    targetSocial: "socials",
    destination: {
      provider: "social",
      channelName: "Socials watchlist"
    }
  },
  {
    id: "night-watch",
    avatar: "🌙",
    icon: "locked",
    name: "Night Watch",
    description: "Paused until reactivated",
    category: "topic watch",
    triggerType: "automatic",
    commandName: "night watch <topic>",
    status: "locked",
    targetSocial: "private",
    destination: {
      provider: "hades",
      channelName: "Hades Chat"
    }
  },
  {
    id: "inbox-broom",
    avatar: "🧹",
    icon: "locked",
    name: "Inbox Broom",
    description: "Inactive · Gmail cleanup",
    category: "draft only",
    triggerType: "manual",
    commandName: "!hades cleanup inbox",
    status: "locked",
    targetSocial: "email",
    destination: {
      provider: "gmail",
      channelName: "Gmail cleanup"
    }
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
        "Hades is listening. Speak, ask, or choose a door.",
      status: "completed"
    }
  ];
}

export function createStarterOwnedMinions(now = new Date().toISOString()) {
  return STARTER_MINIONS.map((minion) => ({
    ...minion,
    userId: "local-user",
    instructions: minion.description,
    status: minion.status === "locked" ? "paused" : minion.status,
    createdAt: now,
    updatedAt: now,
    activityLog: [
      {
        id: `${minion.id}-log-1`,
        title: minion.status === "locked" ? "Paused by user" : "Created",
        location: minion.destination?.channelName || formatSocialLabel(minion.targetSocial),
        createdAt: "Jun 13, 2026 · 9:18 AM"
      }
    ]
  }));
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
