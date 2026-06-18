export const VALID_CATEGORIES = ["task", "chat", "shopping", "dev", "fun"];
export const VALID_TRIGGER_TYPES = ["manual", "command", "watcher"];
export const VALID_TARGET_SOCIALS = ["discord", "telegram", "slack", "github", "email", "private"];

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
    id: "slack",
    provider: "slack",
    displayName: "Slack",
    status: "not_connected",
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

export function createInitialMessages() {
  return [
    {
      id: "welcome-assistant",
      userId: "local-user",
      conversationId: null,
      clientMessageId: null,
      idempotencyKey: null,
      sequenceNumber: 1,
      role: "assistant",
      content:
        "Tell me what kind of minion you want. You can say it directly, like: I want a command to send cat memes in Discord.",
      status: "completed",
      suggestions: [],
      createdAt: "2026-06-10T00:00:00.000Z",
      updatedAt: "2026-06-10T00:00:00.000Z"
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

export function deriveLevelState(minionCount, now = new Date().toISOString()) {
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
    updatedAt: now
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
    case "slack":
      return "Slack";
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
