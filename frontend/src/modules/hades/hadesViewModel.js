import { formatSocialLabel } from "./hadesData.js";

function normalizeStatus(status) {
  if (!status) return "active";
  if (status === "paused" || status === "inactive" || status === "locked") return "paused";
  if (status === "needs_approval") return "needs_approval";
  return "active";
}

function normalizeMode(minion) {
  if (minion?.mode) return minion.mode;
  if (minion?.triggerType === "automatic" || minion?.triggerType === "watcher") return "automatic";
  return "manual";
}

function buildFollowUpExamples(minion) {
  const name = minion?.name || "this minion";
  const base = [
    `!hades make ${name.toLowerCase()} more playful`,
    `!hades ask before changing ${name.toLowerCase()}`,
    `!hades send it to a different channel`
  ];

  return base;
}

function buildPlainDescription(minion) {
  const description = minion?.description || minion?.instructions || "This minion is ready to be explained in simple language.";
  const followUps = buildFollowUpExamples(minion);
  return `${description} Use !hades if you want changes.\n${followUps.join("\n")}`;
}

function buildDestinationPreview(minion) {
  const destination = minion?.destination || {};
  const provider = destination.provider || minion?.targetSocial || "private";
  const channel = destination.channelName || destination.channel || destination.label || formatSocialLabel(provider);

  if (provider === "discord") {
    return {
      type: "discord",
      title: "Summon Preview",
      label: channel,
      previewMessages: [
        { sender: "Pu", text: minion?.commandName || "!sendcat funny lawyer cat" },
        { sender: minion?.name || "Hades", text: "posts the requested Discord message" }
      ]
    };
  }

  if (provider === "email" || provider === "gmail") {
    return {
      type: "gmail",
      title: "Gmail Preview",
      label: channel,
      previewMessages: [
        { sender: "From: Hades OS", text: "To: you@example.com" },
        { sender: "Subject", text: `${minion?.name || "Minion"} summary draft` },
        { sender: minion?.name || "Hades", text: "created a summary and is waiting for approval." }
      ]
    };
  }

  if (provider === "automation") {
    return {
      type: "automation",
      title: "Automation Preview",
      label: channel,
      previewMessages: [
        { sender: minion?.name || "Hades", text: "checked the latest state." },
        { sender: "Run", text: "No message sent." }
      ]
    };
  }

  return {
    type: "hades_chat",
    title: "Hades Preview",
    label: channel,
    previewMessages: [
      { sender: "Hades", text: "This minion will respond in Hades chat first." },
      { sender: minion?.name || "Hades", text: "Ready for a test run." }
    ]
  };
}

function buildCommandSyntax(minion) {
  if (minion?.commandName) return minion.commandName;
  if (minion?.triggerType === "automatic") return "automatic schedule";
  if (minion?.category === "shopping") return "price tracker <product link> <target price>";
  if (minion?.category === "chat") return "!summarize <how much detail>";
  return "!hades <follow-up>";
}

function buildStatusModeCard(minion) {
  const status = normalizeStatus(minion?.status);
  const mode = normalizeMode(minion);
  const destination = formatSocialLabel(minion?.targetSocial || minion?.destination?.provider || "private");

  return {
    statusLabel: status === "paused" ? "Paused" : "Active",
    modeLabel: mode === "automatic" ? "Automatic" : "Manual summon",
    destinationLabel: destination,
    scheduleLabel: minion?.schedule || (mode === "automatic" ? "Every 5 hours" : null)
  };
}

export function buildMinionScreenViewModel(state, options = {}) {
  if (state && typeof state === "object" && !Array.isArray(state)) {
    const { listMinions } = state;
    if (typeof listMinions === "function") {
      return listMinions().then((data) => {
        if (Array.isArray(data)) data = { minions: data };
        if (data) {
          return buildMinionScreenViewModel(data);
        }
        return { active: [], inactive: [], slots: [], hasMoreActive: false, hasMoreInactive: false, minions: [] };
      });
    }
  }

  const { listMinions } = options;
  if (typeof listMinions === "function") {
    return listMinions().then((data) => {
      if (Array.isArray(data)) data = { minions: data };
      if (data) {
        return buildMinionScreenViewModel(data);
      }
      return { active: [], inactive: [], slots: [], hasMoreActive: false, hasMoreInactive: false, minions: [] };
    });
  }

  if (!state) state = {};
  const minions = Array.isArray(state.minions) ? state.minions : [];
  const active = [];
  const inactive = [];

  for (const minion of minions) {
    const normalized = {
      ...minion,
      status: normalizeStatus(minion?.status),
      mode: normalizeMode(minion),
      destinationLabel: formatSocialLabel(minion?.targetSocial || minion?.destination?.provider || "private"),
      commandSyntax: buildCommandSyntax(minion)
    };

    if (normalized.status === "active") {
      active.push(normalized);
    } else {
      inactive.push(normalized);
    }
  }

  const slots = active.slice(0, 3).map((minion) => ({
    id: minion.id,
    name: minion.name,
    commandSyntax: minion.commandSyntax
  }));

  while (slots.length < 4) {
    slots.push({
      id: `empty-${slots.length}`,
      name: "Empty Slot",
      commandSyntax: null
    });
  }

  return {
    active,
    inactive,
    slots,
    hasMoreActive: active.length > 3,
    hasMoreInactive: inactive.length > 0,
    minions: [...active, ...inactive]
  };
}

export function buildMinionDetailViewModel(minion, options) {
  const getMinion = typeof options?.getMinion === "function" ? options.getMinion : null;
  const hasGetMinion = !!getMinion;

  if (hasGetMinion) {
    const id = typeof minion === "string" ? minion : minion?.id;
    if (id) {
      return getMinion(id).then((data) => {
        if (data === null || data === undefined) return null;
        return buildMinionDetailViewModel(data);
      });
    }
  }

  if (!minion) minion = {};
  const statusMode = buildStatusModeCard(minion);
  const destinationPreview = buildDestinationPreview(minion);

  return {
    id: minion.id || null,
    name: minion.name || "Unnamed minion",
    icon: minion.icon || "task",
    statusMode,
    sourceLabel: minion.sourceLabel || formatSocialLabel(minion?.targetSocial || minion?.destination?.provider || "private"),
    destinationPreview,
    commandSyntax: buildCommandSyntax(minion),
    plainDescription: buildPlainDescription(minion),
    followUpExamples: buildFollowUpExamples(minion),
    actions: [
      "Test run",
      "Edit minion",
      "Pause / Resume",
      "View logs"
    ],
    activityLog: Array.isArray(minion.activityLog) ? minion.activityLog : []
  };
}

import { normalizeMessageActions } from "./chatActions.js";

export function normalizeMessage(message) {
  if (!message) return message;
  return normalizeMessageActions(message);
}

export function buildNotificationViewModel(notifications, options = {}) {
  if (notifications && typeof notifications === "object" && !Array.isArray(notifications)) {
    const { listNotifications } = notifications;
    if (typeof listNotifications === "function") {
      return listNotifications().then((data) => {
        if (data) {
          return buildNotificationViewModel(data);
        }
        return { manual: [], automated: [], notifications: [] };
      });
    }
  }

  const { listNotifications } = options;
  if (typeof listNotifications === "function") {
    return listNotifications().then((data) => {
      if (data) {
        return buildNotificationViewModel(data);
      }
      return { manual: [], automated: [], notifications: [] };
    });
  }

  if (!notifications) notifications = [];
  const manual = [];
  const automated = [];

  for (const notification of notifications) {
    const entry = {
      ...notification,
      mode: notification.mode === "automated" ? "automated" : "manual",
      locationLabel: buildNotificationLocationLabel(notification),
      openLabel: buildNotificationOpenLabel(notification)
    };

    if (entry.mode === "automated") {
      automated.push(entry);
    } else {
      manual.push(entry);
    }
  }

  return { manual, automated, notifications: [...manual, ...automated] };
}

function buildNotificationLocationLabel(notification = {}) {
  const provider = notification.provider || "hades";

  if (provider === "discord") {
    return `Discord · ${notification.server || "Server"} · ${notification.channel || "#general"} · message ${notification.messageId || "unknown"}`;
  }

  if (provider === "gmail") {
    return `Gmail · ${notification.account || "account"} · to: ${notification.recipient || "recipient@example.com"} · subject: ${notification.subject || "Draft"}`;
  }

  if (provider === "social") {
    return `Socials · ${notification.label || "assignment"} · ${notification.detail || "Latest action"}`;
  }

  return `Hades Chat · ${notification.label || "session"}`;
}

function buildNotificationOpenLabel(notification = {}) {
  const provider = notification.provider || "hades";

  if (provider === "discord") return "Open Discord location";
  if (provider === "gmail") return "Open Gmail thread";
  if (provider === "social") return "Open social location";
  return "Open Hades chat";
}
