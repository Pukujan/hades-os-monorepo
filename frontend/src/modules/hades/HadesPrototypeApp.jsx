import React from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider.jsx";
import {
  Building2,
  Cat,
  Hammer,
  Mail,
  MessageSquareText,
  Palette,
  GitFork,
  Shield,
  ShoppingBag,
  Sparkles,
  Wrench
} from "lucide-react";
import {
  LOCKED_PREVIEWS,
  MOBILE_NAV,
  SOCIAL_LINKS,
  STARTER_MINIONS,
  STARTER_PROMPTS,
  THEME_CHOICES,
  createEmptyDraft,
  createInitialInbox,
  createInitialMessages,
  createStarterOwnedMinions,
  deriveLevelState,
  formatSocialLabel,
  getSocialIcon
} from "./hadesData.js";
import {
  buildMinionDetailViewModel,
  buildMinionScreenViewModel,
  buildNotificationViewModel
} from "./hadesViewModel.js";
import { buildAssistantReply, buildTestOutput, missingDraftFields } from "./parser.js";
import {
  buildLocalDraftFallback,
  deleteHadesMessages,
  getHadesBootstrap,
  mapBootstrapToHadesState,
  postHadesAssignment,
  postHadesChat,
  postHadesMinion,
  postHadesMinionTest
} from "./hadesApi.js";

const HadesContext = React.createContext(null);

const ICONS = {
  task: Wrench,
  chat: MessageSquareText,
  github: GitFork,
  cat: Cat,
  shopping: ShoppingBag,
  market: ShoppingBag,
  locked: Shield,
  sparkles: Sparkles,
  discord: DiscordBrandIcon,
  telegram: TelegramBrandIcon,
  email: Mail,
  private: Shield,
  hammer: Hammer,
  palette: Palette,
  building: Building2
};

function useHades() {
  const context = React.useContext(HadesContext);
  if (!context) {
    throw new Error("useHades must be used within HadesContext");
  }
  return context;
}

function readJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function usePersistentState(key, fallback) {
  const [value, setValue] = React.useState(() => readJson(key, fallback));

  React.useEffect(() => {
    writeJson(key, value);
  }, [key, value]);

  return [value, setValue];
}

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function AppIcon({ name, className = "", size = 18, strokeWidth = 2.2, title }) {
  const Icon = ICONS[name];
  if (!Icon) {
    return <span className={className}>{name}</span>;
  }

  return <Icon className={className} size={size} strokeWidth={strokeWidth} aria-hidden={title ? undefined : true} title={title} />;
}

function DiscordBrandIcon({ className = "", size = 18, title }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden={title ? undefined : true} title={title}>
      <path d="M19.54 5.34A16.6 16.6 0 0 0 15.4 4l-.2.4c1.57.38 2.29.92 2.29.92a8.11 8.11 0 0 0-2.59-.8 8.82 8.82 0 0 0-5.8 0 8.1 8.1 0 0 0-2.59.8s.76-.57 2.44-.95L8.76 4a16.64 16.64 0 0 0-4.16 1.35C1.97 9.22 1.26 13 1.61 16.72A16.86 16.86 0 0 0 6.7 19.3l1.1-1.5c-.62-.24-1.22-.56-1.78-.95.15.11 1.9 1.47 5.98 1.47 4.08 0 5.82-1.36 5.98-1.47-.56.39-1.15.71-1.78.95l1.1 1.5a16.76 16.76 0 0 0 5.09-2.58c.41-4.3-.69-8.04-2.85-11.38ZM9.7 14.45c-.86 0-1.56-.8-1.56-1.78 0-.98.69-1.78 1.56-1.78.87 0 1.57.8 1.56 1.78 0 .98-.69 1.78-1.56 1.78Zm4.6 0c-.86 0-1.56-.8-1.56-1.78 0-.98.69-1.78 1.56-1.78.87 0 1.57.8 1.56 1.78 0 .98-.69 1.78-1.56 1.78Z" />
    </svg>
  );
}

function TelegramBrandIcon({ className = "", size = 18, title }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden={title ? undefined : true} title={title}>
      <path d="M21.44 4.54a1.5 1.5 0 0 0-1.52-.23L3.8 10.88a1.5 1.5 0 0 0 .14 2.83l4.03 1.33 1.49 4.64a1.5 1.5 0 0 0 2.64.46l2.26-3.08 3.84 2.83a1.5 1.5 0 0 0 2.36-.9l2.22-12.95a1.5 1.5 0 0 0-.34-1.5ZM9.48 14.26l8.86-5.52-6.9 6.99-.42 2.83-1.54-4.3Z" />
    </svg>
  );
}

function toTitleCase(text) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getScreenFromPath(pathname) {
  if (pathname.startsWith("/app/home")) return "minions";
  if (pathname.startsWith("/app/minions")) return "minions";
  if (pathname.startsWith("/app/socials")) return "socials";
  if (pathname.startsWith("/app/inbox")) return "inbox";
  if (pathname.startsWith("/app/settings")) return "settings";
  if (pathname.startsWith("/forge")) return "forge";
  if (pathname.startsWith("/market")) return "market";
  if (pathname.startsWith("/creator")) return "creator";
  if (pathname.startsWith("/business")) return "business";
  if (pathname.startsWith("/admin")) return "admin";
  return "home";
}

function getScreenTitle(screen) {
  switch (screen) {
    case "home":
    case "minions":
      return "Minions";
    case "socials":
      return "Social Links";
    case "inbox":
      return "Inbox";
    case "settings":
      return "Settings";
    case "forge":
      return "Private Forge";
    case "market":
      return "Marketplace";
    case "creator":
      return "Creator";
    case "business":
      return "Business";
    case "admin":
      return "Admin";
    default:
      return "Hades OS";
  }
}

function HadesProvider({ children }) {
  const [theme, setThemeState] = usePersistentState("hades.theme", "ember");
  const [messages, setMessages] = usePersistentState("hades.chatMessages", createInitialMessages());
  const [draft, setDraft] = usePersistentState("hades.draft", createEmptyDraft());
  const [minions, setMinions] = usePersistentState("hades.minions", createStarterOwnedMinions());
  const [inbox, setInbox] = usePersistentState("hades.inboxAlerts", createInitialInbox());
  const [assignments, setAssignments] = usePersistentState("hades.assignments", []);
  const [levelState, setLevelState] = usePersistentState("hades.levelState", deriveLevelState(createStarterOwnedMinions().length));
  const [conversationId, setConversationId] = usePersistentState("hades.conversationId", null);
  const [toast, setToast] = React.useState(null);
  const [composerText, setComposerText] = React.useState("");
  const [selectedStarterId, setSelectedStarterId] = React.useState("task-helper");
  const [selectedMinionId, setSelectedMinionId] = usePersistentState("hades.selectedMinionId", "task-helper");
  const [selectedSocialId, setSelectedSocialId] = usePersistentState("hades.selectedSocialId", "discord");
  const [assignmentCommand, setAssignmentCommand] = usePersistentState("hades.assignmentCommand", "");
  const [futurePlanCache, setFuturePlanCache] = usePersistentState("hades.futurePlanCache", [
    {
      id: "plan-auth",
      title: "Wire backend auth verification",
      description: "Confirm Supabase session checks before Hermes execution."
    },
    {
      id: "plan-discord",
      title: "Finish Discord send runtime",
      description: "Resolve assigned minions and send actual messages or GIFs."
    }
  ]);
  const [futurePlanDraft, setFuturePlanDraft] = React.useState("");
  const [notifications, setNotifications] = usePersistentState("hades.notifications", [
    {
      id: "note-discord",
      mode: "manual",
      provider: "discord",
      server: "Hades Test Server",
      channel: "#cat-chaos",
      messageId: "1042",
      label: "Cat Courier",
      detail: "!sendcat lawyer cat",
      createdAt: "2026-06-13T12:00:00-04:00"
    },
    {
      id: "note-gmail",
      mode: "automated",
      provider: "gmail",
      account: "pujan@gmail.com",
      recipient: "alex@example.com",
      subject: "Summary Draft",
      label: "Scroll Reader",
      detail: "Created summary draft",
      createdAt: "2026-06-13T11:15:00-04:00"
    }
  ]);
  const [detailMinionId, setDetailMinionId] = React.useState(null);
  const [sending, setSending] = React.useState(false);
  const [notificationOpen, setNotificationOpen] = React.useState(false);
  const timersRef = React.useRef([]);
  const toastTimerRef = React.useRef(null);
  const hydratedRef = React.useRef(false);
  const { signOut } = useAuth();

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme;
    writeJson("hades.theme", theme);
  }, [theme]);

  React.useEffect(() => {
    if (!THEME_CHOICES.some((choice) => choice.id === theme)) {
      setThemeState("ember");
    }
  }, [setThemeState, theme]);

  React.useEffect(() => {
    if (!minions.length) return;
    if (minions.some((minion) => minion.id === selectedMinionId)) return;
    setSelectedMinionId(minions[0].id);
  }, [minions, selectedMinionId, setSelectedMinionId]);

  React.useEffect(() => {
    const legacyStarterIds = new Set(["task-helper", "chat-summarizer", "deal-watcher"]);
    const hasLegacySeed = minions.some((minion) => legacyStarterIds.has(minion.id));
    const hasPrototypeSeed = minions.some((minion) => minion.id === "cat-courier" || minion.id === "price-imp");

    if (!hasLegacySeed || hasPrototypeSeed) return;

    const nextMinions = createStarterOwnedMinions();
    setMinions(nextMinions);
    setSelectedMinionId(nextMinions[0]?.id || "cat-courier");
    setLevelState(deriveLevelState(nextMinions.length));
  }, [minions, setLevelState, setMinions, setSelectedMinionId]);

  React.useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    getHadesBootstrap()
      .then((payload) => {
        const state = mapBootstrapToHadesState(payload);
        if (state.conversationId) setConversationId(state.conversationId);
        setMessages(state.messages);
        setDraft(state.draft);
        setMinions(state.minions);
        setInbox((current) => current);
        setAssignments(state.assignments);
        setLevelState(state.levelState);
      })
      .catch(() => {
        hydratedRef.current = true;
      });
  }, []);

  React.useEffect(() => {
    const nextLevel = deriveLevelState(minions.length);
    setLevelState(nextLevel);
  }, [minions.length, setLevelState]);

  React.useEffect(() => {
    if (!minions.some((entry) => entry.id === selectedMinionId)) {
      setSelectedMinionId(minions[0]?.id || "");
    }
  }, [minions, selectedMinionId]);

  React.useEffect(() => {
    const timeoutIds = timersRef.current;
    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
      timersRef.current = [];
    };
  }, []);

  const showToast = React.useCallback((message) => {
    setToast(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2500);
  }, []);

  const pushInbox = React.useCallback((icon, title, description, status = "info") => {
    setInbox((current) => [
      {
        id: createId("alert"),
        icon,
        title,
        description,
        status
      },
      ...current
    ]);
  }, [setInbox]);

  const pushNotification = React.useCallback((notification) => {
    setNotifications((current) => [notification, ...current].slice(0, 12));
  }, [setNotifications]);

  const appendMessage = React.useCallback((message) => {
    setMessages((current) => [...current, message]);
  }, [setMessages]);

  const applyTheme = React.useCallback((nextTheme) => {
    setThemeState(nextTheme);
    showToast(`${THEME_CHOICES.find((choice) => choice.id === nextTheme)?.label || nextTheme} applied.`);
  }, [showToast]);

  const cacheFuturePlan = React.useCallback(() => {
    const text = futurePlanDraft.trim();
    if (!text) {
      showToast("Add a future plan note first.");
      return;
    }

    const note = {
      id: createId("plan"),
      title: text,
      description: "Locally cached for the next implementation phase."
    };
    setFuturePlanCache((current) => [note, ...current].slice(0, 6));
    setFuturePlanDraft("");
    showToast("Future plan cached locally.");
  }, [futurePlanDraft, setFuturePlanCache, showToast]);

  const clearFuturePlans = React.useCallback(() => {
    setFuturePlanCache([]);
    showToast("Future plan cache cleared.");
  }, [setFuturePlanCache, showToast]);

  const openMinionDetail = React.useCallback((minionId) => {
    setDetailMinionId(minionId);
  }, []);

  const closeMinionDetail = React.useCallback(() => {
    setDetailMinionId(null);
  }, []);

  const toggleNotificationDropdown = React.useCallback(() => {
    setNotificationOpen((current) => !current);
  }, []);

  const getAssignmentCommand = React.useCallback(
    () => assignmentCommand.trim() || draft.commandName || null,
    [assignmentCommand, draft.commandName]
  );

  const persistAssignmentForSocial = React.useCallback(
    async (social, minion) => {
      if (!social || !minion) return null;
      const commandName = getAssignmentCommand() || minion.commandName || null;
      const existing = assignments.find(
        (entry) =>
          entry.minionId === minion.id &&
          entry.socialLinkId === social.id &&
          (entry.commandName || null) === (commandName || null)
      );

      if (existing) {
        return existing;
      }

      try {
        const response = await postHadesAssignment({
          minionId: minion.id,
          socialLinkId: social.id,
          commandName,
          idempotencyKey: createId(`assignment-${social.id}`)
        });
        const nextAssignment = response.assignment;
        setAssignments((current) => [...current.filter((entry) => entry.id !== nextAssignment.id), nextAssignment]);
        return nextAssignment;
      } catch {
        const assignment = {
          id: createId(`assignment-${social.id}`),
          userId: "local-user",
          minionId: minion.id,
          socialLinkId: social.id,
          scope: social.provider === "private" ? "private" : "social",
          commandName,
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setAssignments((current) => [...current.filter((entry) => entry.id !== assignment.id), assignment]);
        return assignment;
      }
    },
    [assignments, getAssignmentCommand]
  );

  function selectStarterCard(starterId) {
    const starter = STARTER_MINIONS.find((entry) => entry.id === starterId);
    if (!starter) return;
    if (starter.status === "locked") {
      showToast("That starter is locked in MVP.");
      return;
    }

    setSelectedStarterId(starterId);
    setDraft({
      name: starter.name,
      description: starter.description,
      category: starter.category,
      targetSocial: starter.targetSocial,
      triggerType: starter.triggerType,
      commandName: starter.commandName,
      action: starter.description,
      responseStyle: "helpful",
      safetyMode: "ask_first",
      testInput: null,
      status: "ready_to_test"
    });
    showToast(`${starter.name} selected.`);
  }

  function updateDraft(nextDraft) {
    setDraft(nextDraft);
    if (nextDraft.targetSocial) {
      setSelectedSocialId(nextDraft.targetSocial);
    }
  }

  async function sendMessage(messageText, context = "forge") {
    const text = messageText.trim();
    if (!text) return;

    const userMessageId = createId("msg");
    const userMessage = {
      id: userMessageId,
      role: "user",
      content: text,
      status: "queued"
    };

    appendMessage(userMessage);
    setComposerText("");
    setSending(true);

    try {
      const response = await postHadesChat({
        conversationId: conversationId || undefined,
        clientMessageId: userMessageId,
        idempotencyKey: userMessageId,
        message: text,
        currentDraft: draft,
        context
      });

      if (response?.conversationId) {
        setConversationId(response.conversationId);
      }

      setMessages((current) =>
        current.map((entry) => (entry.id === userMessageId ? { ...entry, status: "completed" } : entry)).concat({
          id: response.assistantMessage?.id || createId("msg"),
          role: "assistant",
          content: response.assistantMessage?.content || "Draft updated.",
          status: response.assistantMessage?.status || "completed",
          suggestions: response.assistantMessage?.suggestions || []
        })
      );
      updateDraft(response.draft);
    } catch (error) {
      const parsed = buildLocalDraftFallback(text, draft);
      updateDraft(parsed.draft);
      const assistantReply = buildAssistantReply(parsed);
      setMessages((current) =>
        current.map((entry) => (entry.id === userMessageId ? { ...entry, status: "completed" } : entry)).concat({
          id: createId("msg"),
          role: "assistant",
          content: assistantReply.content,
          status: assistantReply.status,
          suggestions: assistantReply.suggestions
        })
      );
      showToast(error?.message ? `Using local fallback: ${error.message}` : "Using local fallback.");
    }
    setSending(false);
  }

  async function clearMessages() {
    if (conversationId) {
      try {
        await deleteHadesMessages(conversationId);
      } catch { /* best effort */ }
    }
    setMessages([]);
  }

  async function runDraftTest() {
    const missing = missingDraftFields(draft);
    if (missing.length > 0) {
      showToast(`Need: ${missing.join(", ")}.`);
      appendMessage({
        id: createId("msg"),
        role: "assistant",
        content: `This minion still needs: ${missing.join(", ")}.`,
        status: "completed"
      });
      return;
    }

    try {
      const response = await postHadesMinionTest({
        draft,
        testInput: draft.testInput,
        idempotencyKey: createId("test")
      });
      updateDraft(response.draft);
      pushInbox("sparkles", "Test completed", response.testRun.output, "success");
      pushNotification({
        id: createId("note"),
        mode: "manual",
        provider: "discord",
        server: "Hades Test Server",
        channel: "#forge-tests",
        messageId: createId("message"),
        label: response.draft.name || "Draft",
        detail: response.testRun.output,
        minionId: selectedMinionId,
        createdAt: new Date().toISOString()
      });
      appendMessage({
        id: createId("msg"),
        role: "assistant",
        content: `Simulation result: ${response.testRun.output}`,
        status: "completed"
      });
      showToast("Simulated test passed.");
    } catch {
      const output = buildTestOutput(draft);
      const testedDraft = { ...draft, status: "tested", testInput: draft.commandName ? `User types: ${draft.commandName}` : "Simulated input" };
      updateDraft(testedDraft);
      pushInbox("sparkles", "Test completed", output, "success");
      pushNotification({
        id: createId("note"),
        mode: "manual",
        provider: "discord",
        server: "Hades Test Server",
        channel: "#forge-tests",
        messageId: createId("message"),
        label: testedDraft.name || "Draft",
        detail: output,
        minionId: selectedMinionId,
        createdAt: new Date().toISOString()
      });
      appendMessage({
        id: createId("msg"),
        role: "assistant",
        content: `Simulation result: ${output}`,
        status: "completed"
      });
      showToast("Simulated test passed.");
    }
  }

  async function saveDraft() {
    const missing = missingDraftFields(draft);
    if (missing.length > 0) {
      showToast(`Need: ${missing.join(", ")}.`);
      return;
    }

    try {
      const response = await postHadesMinion({
        draft,
        idempotencyKey: createId("minion")
      });
      const saved = response.minion;
      setMinions((current) => {
        const filtered = current.filter((entry) => entry.name !== saved.name || entry.commandName !== saved.commandName);
        return [...filtered, saved];
      });
      setSelectedMinionId(saved.id);
      updateDraft({ ...draft, status: "saved" });
      pushInbox("sparkles", "Minion saved", `${saved.name} was added to your inventory.`, "success");
      pushNotification({
        id: createId("note"),
        mode: "automated",
        provider: saved.targetSocial === "email" ? "gmail" : "discord",
        account: "pujan@gmail.com",
        recipient: "approval@example.com",
        subject: `${saved.name} saved`,
        server: "Hades Test Server",
        channel: "#cat-chaos",
        messageId: createId("message"),
        label: saved.name,
        detail: `${saved.name} was added to your inventory.`,
        minionId: saved.id,
        createdAt: now
      });
      appendMessage({
        id: createId("msg"),
        role: "assistant",
        content: `Saved. ${saved.name} is now in your minion inventory. You can assign it to ${formatSocialLabel(saved.targetSocial)} next.`,
        status: "completed"
      });
      showToast(`${saved.name} saved.`);
    } catch {
      const now = new Date().toISOString();
      const id = createId("minion");
      const saved = {
        id,
        userId: "local-user",
        icon: draft.category === "fun" ? "cat" : draft.category === "chat" ? "chat" : draft.category === "shopping" ? "shopping" : draft.category === "dev" ? "github" : "task",
        name: draft.name,
        description: draft.description,
        instructions: draft.action,
        category: draft.category,
        triggerType: draft.triggerType,
        commandName: draft.commandName,
        status: "active",
        targetSocial: draft.targetSocial,
        createdAt: now,
        updatedAt: now
      };

      setMinions((current) => {
        const filtered = current.filter((entry) => entry.name !== saved.name || entry.commandName !== saved.commandName);
        return [...filtered, saved];
      });
      setSelectedMinionId(id);
      updateDraft({ ...draft, status: "saved" });
      pushInbox("sparkles", "Minion saved", `${saved.name} was added to your inventory.`, "success");
      pushNotification({
        id: createId("note"),
        mode: "automated",
        provider: saved.targetSocial === "email" ? "gmail" : "discord",
        account: "pujan@gmail.com",
        recipient: "approval@example.com",
        subject: `${saved.name} saved`,
        server: "Hades Test Server",
        channel: "#cat-chaos",
        messageId: createId("message"),
        label: saved.name,
        detail: `${saved.name} was added to your inventory.`,
        minionId: id,
        createdAt: now
      });
      appendMessage({
        id: createId("msg"),
        role: "assistant",
        content: `Saved. ${saved.name} is now in your minion inventory. You can assign it to ${formatSocialLabel(saved.targetSocial)} next.`,
        status: "completed"
      });
      showToast(`${saved.name} saved.`);
    }
  }

  async function assignSelectedMinion() {
    const minion = minions.find((entry) => entry.id === selectedMinionId);
    const social = SOCIAL_LINKS.find((entry) => entry.id === selectedSocialId);
    if (!minion) {
      showToast("Choose a minion first.");
      return;
    }

    const result = await persistAssignmentForSocial(social, minion);
    if (!result) {
      showToast("Choose a connected social first.");
      return;
    }

    pushInbox("socials", "Minion assigned", `${minion.name} is now assigned to ${social?.displayName || "a social placeholder"}.`, "info");
    pushNotification({
      id: createId("note"),
      mode: "manual",
      provider: social?.provider || "discord",
      server: "Hades Test Server",
      channel: social?.provider === "telegram" ? "@hades-test" : "#cat-chaos",
      messageId: createId("message"),
      label: minion.name,
      detail: `Assigned to ${social?.displayName || "social placeholder"}.`,
      minionId: minion.id,
      createdAt: new Date().toISOString()
    });
    appendMessage({
      id: createId("msg"),
      role: "assistant",
      content: `${minion.name} assigned to ${social?.displayName || "the selected social"} as a preview. ${social?.status === "connected" ? "That connection is live." : "The connection is not live yet."}`,
      status: "completed"
    });
    showToast(`${minion.name} assigned.`);
    setAssignmentCommand("");
  }

  async function assignSelectedMinionToAllConnected() {
    const minion = minions.find((entry) => entry.id === selectedMinionId);
    if (!minion) {
      showToast("Choose a minion first.");
      return;
    }

    const connectedSocials = SOCIAL_LINKS.filter((entry) => entry.status === "connected");
    if (!connectedSocials.length) {
      showToast("No connected socials yet.");
      return;
    }

    const results = [];
    for (const social of connectedSocials) {
      const assignment = await persistAssignmentForSocial(social, minion);
      if (assignment) results.push({ social, assignment });
    }

    if (results.length) {
      pushInbox("socials", "Assigned to all", `${minion.name} was assigned to ${results.length} connected social${results.length === 1 ? "" : "s"}.`, "success");
      pushNotification({
        id: createId("note"),
        mode: "automated",
        provider: "discord",
        server: "Hades Test Server",
        channel: "#cat-chaos",
        messageId: createId("message"),
        label: minion.name,
        detail: `Assigned to ${results.length} connected social${results.length === 1 ? "" : "s"}.`,
        minionId: minion.id,
        createdAt: new Date().toISOString()
      });
      appendMessage({
        id: createId("msg"),
        role: "assistant",
        content: `${minion.name} assigned to all connected socials.`,
        status: "completed"
      });
      showToast(`Assigned to ${results.length} connected social${results.length === 1 ? "" : "s"}.`);
    }
  }

  return (
    <HadesContext.Provider
      value={{
        theme,
        setTheme: applyTheme,
        toast,
        showToast,
        messages,
        sending,
        composerText,
        setComposerText,
        sendMessage,
        clearMessages,
        draft,
        updateDraft,
        runDraftTest,
        saveDraft,
        minions,
        selectedMinionId,
        setSelectedMinionId,
        selectedSocialId,
        setSelectedSocialId,
        assignmentCommand,
        setAssignmentCommand,
        assignments,
        assignSelectedMinion,
        assignSelectedMinionToAllConnected,
        futurePlanCache,
        futurePlanDraft,
        setFuturePlanDraft,
        cacheFuturePlan,
        clearFuturePlans,
        notifications,
        pushNotification,
        notificationOpen,
        setNotificationOpen,
        toggleNotificationDropdown,
        detailMinionId,
        setDetailMinionId,
        openMinionDetail,
        closeMinionDetail,
        inbox,
        levelState,
        selectedStarterId,
        setSelectedStarterId,
        selectStarterCard
      }}
    >
      {children}
    </HadesContext.Provider>
  );
}

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast, minions, levelState, detailMinionId, closeMinionDetail, theme, setTheme, notificationOpen, toggleNotificationDropdown } = useHades();
  const screen = getScreenFromPath(location.pathname);
  const themeIndex = Math.max(0, THEME_CHOICES.findIndex((choice) => choice.id === theme));
  const nextTheme = THEME_CHOICES[(themeIndex + 1) % THEME_CHOICES.length];
  const realmCopy = {
    minions: "Your minions await command.",
    forge: "Shape a helper from plain language.",
    socials: "Connect tools with approval.",
    settings: "Keep control simple and visible.",
    inbox: "Pending sync notifications."
  }[screen] || "Ask Hades to forge a helper.";
  const activeSlots = Math.min(minions.length, levelState.level);

  return (
    <div className="viewport">
      <section className="phone">
        <div className="forge-glow" aria-hidden="true" />
        <div className="app">
          <header className="header">
            <div className="top">
              <div>
                <h1 className="app-title">HADES OS</h1>
                <p className="realm">{realmCopy}</p>
              </div>
              <div className="actions">
                <div className="notification-wrap">
                  <button className="icon" type="button" onClick={toggleNotificationDropdown} aria-label="Open notifications">
                    ✦
                    <span className="dot" />
                  </button>
                </div>
                <button className="theme-btn" type="button" onClick={() => setTheme(nextTheme.id)}>
                  THEMES
                </button>
              </div>
            </div>
            <section className="status">
              <div>
                <h2>{levelState.title}</h2>
                <p>
                  LVL {levelState.level} · {activeSlots} active slot{activeSlots === 1 ? "" : "s"}
                </p>
              </div>
              <div className="level">LVL {levelState.level}</div>
              <div className="xp">
                <i style={{ width: `${Math.min(100, 38 + levelState.level * 18)}%` }} />
              </div>
            </section>
          </header>

          <section className="content">
            <div className="screen active">
              <Outlet />
            </div>
            <NotificationDropdown />
            {detailMinionId ? <MinionDetailView minionId={detailMinionId} onClose={closeMinionDetail} /> : null}
          </section>

          <nav className="bottom">
            <div className="nav">
              <button className={`nav-btn ${screen === "minions" ? "active" : ""}`} onClick={() => navigate("/app/minions")}>
                <span className="nav-icon">♟</span>
                <span className="nav-label">MINIONS</span>
              </button>
              <button className={`nav-btn ${screen === "forge" ? "active" : ""}`} onClick={() => navigate("/forge")}>
                <span className="nav-icon">⚒</span>
                <span className="nav-label">FORGE</span>
              </button>
              <button className={`nav-btn ${screen === "socials" ? "active" : ""}`} onClick={() => navigate("/app/socials")}>
                <span className="nav-icon">◎</span>
                <span className="nav-label">SOCIALS</span>
              </button>
              <button className={`nav-btn ${screen === "settings" ? "active" : ""}`} onClick={() => navigate("/app/settings")}>
                <span className="nav-icon">☰</span>
                <span className="nav-label">SETTINGS</span>
              </button>
            </div>
          </nav>

          <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <div className="section-title">
      <h3>{title}</h3>
      <span>{subtitle}</span>
    </div>
  );
}

function ScreenHead({ title, subtitle }) {
  return (
    <div className="screen-head">
      <div>
        <h2 className="screen-title">{title}</h2>
        <p className="screen-sub">{subtitle}</p>
      </div>
    </div>
  );
}

function Bubble({ message, showStamp = true }) {
  const { sendMessage } = useHades();
  const className = `bubble ${message.role === "user" ? "user" : "hades"} ${message.status === "queued" ? "pending" : ""}`;

  return (
    <div className={className}>
      <span dangerouslySetInnerHTML={{ __html: message.content }} />
      {showStamp ? <span className="stamp">{message.createdAt || "Just now"}</span> : null}
      {message.status === "queued" ? <small>Pending sync</small> : null}
    </div>
  );
}

function LoadingDots() {
  return (
    <div className="loading">
      Your message is sent. Hades is replying
      <span className="spark" />
      <span className="spark" />
      <span className="spark" />
    </div>
  );
}

function ChatComposer() {
  const { composerText, setComposerText, sendMessage } = useHades();

  return (
    <div className="composer">
      <textarea
        id="chatInput"
        rows={1}
        value={composerText}
        placeholder="Ask Hades to create or test a minion..."
        onChange={(event) => setComposerText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage(composerText);
          }
        }}
      />
      <button className="btn" type="button" onClick={() => sendMessage(composerText)}>
        Send
      </button>
    </div>
  );
}

function DraftCard() {
  const { draft, runDraftTest, saveDraft, assignSelectedMinion } = useHades();
  const missing = missingDraftFields(draft);
  const ready = missing.length === 0;
  const statusLabel =
    draft.status === "saved" ? "Saved" : draft.status === "tested" ? "Tested" : ready ? "Ready to test" : "Incomplete";

  return (
    <article className="draft-card" id="draftCard">
      <div className="draft-head">
        <h3>Live draft</h3>
        <span className="draft-status">{statusLabel}</span>
      </div>
      <div className="field-list">
        <div className={`field ${draft.name ? "" : "missing"}`}>
          <span>Name</span>
          <span>{draft.name || "Not set"}</span>
        </div>
        <div className={`field ${draft.targetSocial ? "" : "missing"}`}>
          <span>Where</span>
          <span>{draft.targetSocial ? formatSocialLabel(draft.targetSocial) : "Not set"}</span>
        </div>
        <div className={`field ${draft.triggerType ? "" : "missing"}`}>
          <span>Trigger</span>
          <span>
            {draft.triggerType ? `${toTitleCase(draft.triggerType)}${draft.commandName ? ` · ${draft.commandName}` : ""}` : "Not set"}
          </span>
        </div>
        <div className={`field ${draft.action ? "" : "missing"}`}>
          <span>Action</span>
          <span>{draft.action || "Not set"}</span>
        </div>
      </div>
      <div className="draft-actions">
        <button className="btn secondary" type="button" onClick={runDraftTest} disabled={!ready}>
          Test
        </button>
        <button className="btn secondary" type="button" onClick={saveDraft} disabled={!ready}>
          Save
        </button>
        <button className="btn secondary" type="button" onClick={assignSelectedMinion} disabled={!ready}>
          Assign
        </button>
      </div>
    </article>
  );
}

function MinionCard({ minion }) {
  const { openMinionDetail } = useHades();
  const isPaused = minion.status === "paused" || minion.status === "locked";

  return (
    <article className="minion-card">
      <div className="avatar">{minion.avatar || <AppIcon name={minion.icon} />}</div>
      <div>
        <h4 className="name">{minion.name}</h4>
        <p className="task">
          <span className={`status-dot ${isPaused ? "pause" : ""}`} />
          {minion.description}
        </p>
        <div className="meta-mini">
          <span className="meta-pill">{minion.commandName || toTitleCase(minion.triggerType)}</span>
          <span className="meta-pill">{formatSocialLabel(minion.targetSocial)}</span>
        </div>
      </div>
      <button className="detail-btn" type="button" onClick={() => openMinionDetail(minion.id)}>
        Detail
      </button>
    </article>
  );
}

function SocialCard({ social }) {
  const { assignments, setSelectedSocialId, selectedSocialId } = useHades();
  const assigned = assignments.filter((entry) => entry.socialLinkId === social.id);
  const slotUsage = `${Math.min(assigned.length, 3)}/3`;
  const active = social.status === "connected";

  return (
    <button
      type="button"
      className={`social-tile ${selectedSocialId === social.id ? "selected" : ""}`}
      aria-label={`${social.displayName} ${active ? "connected" : "not connected"} ${slotUsage}`}
      onClick={() => setSelectedSocialId(social.id)}
    >
      <span className={`social-status-dot ${active ? "live" : "offline"}`} aria-hidden="true" />
      <span className={`social-tile-icon provider-${social.provider}`}>
        <AppIcon name={getSocialIcon(social.provider)} size={24} />
      </span>
      <span className={`social-slot-count ${assigned.length ? "filled" : ""}`}>{slotUsage}</span>
      <span className="sr-only">{social.displayName}</span>
    </button>
  );
}

function AlertCard({ alert }) {
  return (
    <article className="alert">
      <div className="alert-top">
        <div className="avatar"><AppIcon name={alert.icon} /></div>
        <div>
          <h4>{alert.title}</h4>
          <p>{alert.description}</p>
        </div>
        <span className={`badge ${alert.status === "success" ? "active" : alert.status === "locked" ? "locked" : ""}`}>
          {alert.status === "success" ? "Done" : alert.status === "locked" ? "Locked" : "Info"}
        </span>
      </div>
    </article>
  );
}

function NotificationDropdown() {
  const { notifications, notificationOpen, toggleNotificationDropdown, setNotificationOpen, openMinionDetail } = useHades();
  const [tab, setTab] = React.useState("manual");
  const [openContextId, setOpenContextId] = React.useState(null);
  const view = buildNotificationViewModel(notifications);
  const visible = tab === "manual" ? view.manual : view.automated;

  return (
    <aside className={`notification-menu ${notificationOpen ? "show" : ""}`} aria-hidden={!notificationOpen}>
      <div className="notification-head">
        <h3>NOTIFICATIONS</h3>
        <button className="tiny" type="button" onClick={toggleNotificationDropdown}>
          Close
        </button>
      </div>
      <div className="log-tabs">
        <button type="button" className={`log-tab ${tab === "manual" ? "active" : ""}`} onClick={() => setTab("manual")}>
          MANUAL
        </button>
        <button type="button" className={`log-tab ${tab === "automated" ? "active" : ""}`} onClick={() => setTab("automated")}>
          AUTO
        </button>
      </div>
      <div className="notification-body">
        {visible.map((entry) => {
          const isOpen = openContextId === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              className="log-item"
              onClick={() => openMinionDetail(entry.minionId || "task-helper")}
            >
              <strong>{entry.label || "Notification"}</strong>
              <p>{entry.detail || "Preview available."}</p>
              <span className="location-line">{entry.locationLabel}</span>
              <span className="stamp">{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "Recent"}</span>
              <span className="tools">
                <span className="tool">{entry.mode === "automated" ? "⚙ Auto" : "💬 Manual"}</span>
                <span className="tool">{entry.provider === "gmail" ? "✉ Gmail" : "◎ Discord"}</span>
                <span
                  className="location-btn"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setOpenContextId(isOpen ? null : entry.id);
                  }}
                >
                  Open location
                </span>
              </span>
              <span className={`context-panel ${isOpen ? "show" : ""}`}>
                <p>{entry.openLabel}</p>
                <code>{entry.locationLabel}</code>
              </span>
            </button>
          );
        })}
        {!visible.length ? <p className="task" style={{ margin: 0 }}>No notifications yet.</p> : null}
      </div>
    </aside>
  );
}

function MinionDetailView({ minionId, onClose }) {
  const { minions } = useHades();
  const minion = minions.find((entry) => entry.id === minionId) || minions[0];
  const detail = buildMinionDetailViewModel(minion || {});

  return (
    <aside className="detail-sheet">
      <div className="detail-top">
        <button className="back" type="button" onClick={onClose}>
          Back
        </button>
        <span className="mode-badge">{detail.statusMode.modeLabel.toUpperCase()}</span>
      </div>

      <div className="detail-scroll">
        <section className="card detail-hero">
          <div className="detail-avatar">
            <AppIcon name={detail.icon} size={32} />
          </div>
          <div>
            <h2 className="detail-name">{detail.name}</h2>
            <p className="detail-role">{detail.statusMode.statusLabel} · {detail.statusMode.destinationLabel}</p>
          </div>
        </section>

        <section className="card desc">
          <h4>Status / Mode</h4>
          <div className="status-grid">
            <div className="status-line">
              <span className="detail-label">Mode</span>
              <span>{detail.statusMode.modeLabel}</span>
            </div>
            <div className="status-line">
              <span className="detail-label">Destination</span>
              <span>{detail.statusMode.destinationLabel}</span>
            </div>
          </div>
        </section>

        <section className="card desc">
          <h4>Source / channel</h4>
          <p>{detail.sourceLabel}</p>
          <div className="tools">
            <button className="tool" type="button">💬 Hades chat</button>
            <button className="tool" type="button">◎ Discord</button>
          </div>
        </section>

        <section className="card desc">
          <h4>Destination Preview</h4>
          <p>{detail.destinationPreview.label}</p>
          <div className={`preview-card ${detail.destinationPreview.type === "gmail" ? "gmail-shell" : detail.destinationPreview.type === "automation" ? "auto-shell" : "discord-shell"}`}>
            <div className="preview-top">
              <p className="preview-title">{detail.destinationPreview.title}</p>
              <p className="preview-sub">{detail.destinationPreview.label}</p>
            </div>
            {detail.destinationPreview.previewMessages.map((line, index) => (
              <div key={`${line.sender}-${index}`} className={detail.destinationPreview.type === "gmail" ? "gmail-line" : detail.destinationPreview.type === "automation" ? "run-line" : "discord-msg"}>
                {detail.destinationPreview.type === "discord" ? (
                  <>
                    <div className="discord-avatar">{index === 0 ? "P" : "H"}</div>
                    <div>
                      <p className="discord-name">{line.sender}</p>
                      <p className="discord-text">{line.text}</p>
                    </div>
                  </>
                ) : detail.destinationPreview.type === "gmail" ? (
                  <>
                    <span className="gmail-label">{line.sender}</span>
                    <span>{line.text}</span>
                  </>
                ) : (
                  <>
                    <span>{line.sender}</span>
                    <b>{line.text}</b>
                  </>
                )}
              </div>
            ))}
            {detail.destinationPreview.type === "automation" ? (
              <div className="run-note">This shows what the minion did before sending anything.</div>
            ) : null}
          </div>
        </section>

        <section className="card desc">
          <h4>Command syntax</h4>
          <div className="codebox">{detail.commandSyntax}</div>
        </section>

        <section className="card desc">
          <h4>What this minion does</h4>
          <p style={{ whiteSpace: "pre-line" }}>{detail.plainDescription}</p>
          {detail.followUpExamples.map((example) => (
            <p key={example}>{example}</p>
          ))}
        </section>

        <section className="card">
          <p className="kicker">Actions</p>
          <div className="detail-actions">
            {detail.actions.map((action) => (
              <button key={action} className="small-btn" type="button">
                {action}
              </button>
            ))}
          </div>
        </section>

        <section className="card desc">
          <h4>Activity log</h4>
          <div className="activity-log-scroll">
            {(detail.activityLog.length ? detail.activityLog : [
              { id: "activity-1", title: "Created", createdAt: "Jun 13, 2026 · 9:12 AM", location: "Hades Chat" },
              { id: "activity-2", title: "Test run", createdAt: "Jun 13, 2026 · 9:18 AM", location: "Discord #cat-chaos" }
            ]).map((entry) => (
              <article key={entry.id} className="log-item">
                <strong>{entry.title}</strong>
                <p>{entry.location}</p>
                <span className="stamp">{entry.createdAt}</span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}

function ThemeCard({ choice }) {
  const { theme, setTheme } = useHades();
  const active = theme === choice.id;

  return (
    <button type="button" className={`theme-card ${active ? "active" : ""}`} onClick={() => setTheme(choice.id)}>
      <div className={`swatch ${choice.swatch}`} />
      <div>
        <h4>{choice.label}</h4>
        <p>{choice.description}</p>
      </div>
    </button>
  );
}

function MinionsScreen() {
  const [activeTab, setActiveTab] = React.useState("active");
  const [chatFocused, setChatFocused] = React.useState(false);
  const [chatExpanded, setChatExpanded] = React.useState(false);
  const { minions, messages, sending, composerText, setComposerText, sendMessage, clearMessages, openMinionDetail } = useHades();
  const view = buildMinionScreenViewModel({ minions });
  const visibleMinions = activeTab === "active" ? view.active : view.inactive;
  const chatClass = chatExpanded ? "card chat-card expanded" : `card chat-card${chatFocused ? " focused" : ""}`;

  function handleSend() {
    sendMessage(composerText, "minions");
    setChatFocused(false);
    setChatExpanded(true);
  }

  const recentMessages = messages.slice(-3);

  return (
    <>
      <ScreenHead title="Minions" subtitle="Speak to Hades, then inspect your minions and slots." />
      <div className="scroll">
        <section className={chatClass} id="hadesChatCard">
          <p className="kicker">Speak to Hades
            {messages.length > 0 ? <button className="tiny" type="button" style={{ float: "right" }} onClick={clearMessages}>Clear</button> : null}
          </p>
          {!chatExpanded ? <h3 className="bigline chat-intro">Hades awaits your message.</h3> : null}
          <div className="chat-log" id="minionsChat">
            {recentMessages.map((message) => (
              <React.Fragment key={message.id}>
                <Bubble message={message} />
                {message.suggestions?.length ? (
                  <div className="suggest">
                    {message.suggestions.map((s, i) => {
                      const label = typeof s === "string" ? s : s.label;
                      return <button key={label || i} type="button" onClick={() => { const t = typeof s === "string" ? s : s.text || s.label || ""; sendMessage(t, "minions"); }}>{label}</button>;
                    })}
                  </div>
                ) : null}
              </React.Fragment>
            ))}
            {sending ? <LoadingDots /> : null}
          </div>
          <div className="input-row">
            <textarea
              className="input"
              value={composerText}
              placeholder="Speak thy mind..."
              onFocus={() => { if (!chatExpanded) setChatFocused(true); }}
              onBlur={() => setChatFocused(false)}
              onChange={(event) => setComposerText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
            />
            <button className="primary" type="button" onClick={handleSend}>
              Send
            </button>
          </div>
        </section>

        <div className="section-row">
          <h3>Your Minions</h3>
          <button className="tiny" type="button">View all</button>
        </div>
        <div className="tabs">
          <button type="button" className={`tab ${activeTab === "active" ? "active" : ""}`} onClick={() => setActiveTab("active")}>
            ACTIVE
          </button>
          <button type="button" className={`tab ${activeTab === "inactive" ? "active" : ""}`} onClick={() => setActiveTab("inactive")}>
            INACTIVE
          </button>
        </div>
        <section className="minions-pane">
          <div className="contained-list">
            {visibleMinions.map((minion) => (
              <MinionCard key={minion.id} minion={minion} />
            ))}
            {!visibleMinions.length ? (
              <p className="task" style={{ margin: 0 }}>
                No {activeTab} minions yet.
              </p>
            ) : null}
          </div>
        </section>

        <div className="section-row">
          <h3>Minion Slots</h3>
          <button className="tiny" type="button">Upgrade</button>
        </div>
        <div className="slots">
          {view.slots.map((slot) => {
            const parts = slot.name.split(" ");
            const hasBreak = parts.length > 1;
            return (
              <button key={slot.id} type="button" className={`slot ${slot.commandSyntax ? "filled" : ""}`} onClick={() => (slot.id.startsWith("empty") ? null : openMinionDetail(slot.id))}>
                {hasBreak ? <>{parts[0]}<br />{parts.slice(1).join(" ")}</> : slot.name}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function PermissionsCard({ social }) {
  const avatarMap = { discord: "◎", email: "✉", private: "💬", telegram: "✉", github: "◎" };
  const taskMap = {
    discord: "Connected for approved messages.",
    email: "Approval required before sending.",
    private: "Used for Hades commands.",
    telegram: "Pending connection setup.",
    github: "Awaiting repo integration."
  };

  return (
    <article className="permission">
      <div className="avatar">{avatarMap[social.provider] || "◎"}</div>
      <div>
        <h4 className="name">{social.displayName}</h4>
        <p className="task">{taskMap[social.provider] || "Connected."}</p>
      </div>
      <div className="toggle" />
    </article>
  );
}

function SocialsScreen() {
  return (
    <>
      <ScreenHead title="Socials" subtitle="Connect channels only when minions need them." />
      <div className="scroll">
        <section className="card chat-card">
          <p className="kicker">Permissions</p>
          <h3 className="bigline">Your minions ask before they act.</h3>
          <p className="task">Connected services stay visible and easy to pause.</p>
        </section>

        {SOCIAL_LINKS.map((social) => (
          <PermissionsCard key={social.id} social={social} />
        ))}
      </div>
    </>
  );
}

function InboxScreen() {
  const { inbox } = useHades();

  return (
    <>
      <ScreenHead title="Inbox" subtitle="Pending sync notifications and test results." />
      <div className="scroll">
        <section className="card chat-card">
          <p className="kicker">Inbox preview</p>
          <h3 className="bigline">Keep the user loop visible.</h3>
          <p className="task">Hades sends alerts for save, test, assignment, and locked future feature notices.</p>
        </section>
        <div className="alert-list">
          {inbox.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      </div>
    </>
  );
}

function SettingsScreen() {
  const { theme, setTheme } = useHades();
  const { signOut } = useAuth();

  const handleLogout = React.useCallback(async () => {
    await signOut();
  }, [signOut]);

  return (
    <>
      <ScreenHead title="Settings" subtitle="Keep control simple and visible." />
      <div className="scroll">
        <section className="card chat-card">
          <p className="kicker">Safety Mode</p>
          <h3 className="bigline">Approval required for outside actions.</h3>
          <button className="primary" type="button">
            Keep Safe Mode On
          </button>
        </section>

        <div className="setting">
          <span>Theme</span>
          <span>{THEME_CHOICES.find((choice) => choice.id === theme)?.label || "Ember Forge"}</span>
        </div>
        <div className="setting">
          <span>Account</span>
          <span>Operator profile</span>
        </div>
        <div className="setting">
          <span>Minion limits</span>
          <span>3 / 4 active</span>
        </div>
        <div className="setting">
          <span>Approval logs</span>
          <span>Review</span>
        </div>
        <div className="setting">
          <span>Logout</span>
          <button className="small-btn" type="button" onClick={handleLogout}>
            Exit realm
          </button>
        </div>
      </div>
    </>
  );
}

function ForgeScreen() {
  const { messages, draft, sending, composerText, setComposerText, sendMessage, clearMessages, runDraftTest, saveDraft, minions, openMinionDetail } = useHades();
  const visibleSummons = minions.filter((minion) => minion.status === "active").slice(0, 4);
  const templateChips = [
    { id: "sendcat", label: "SEND CAT", text: "Create a command called !sendcat that sends cat memes in Discord." },
    { id: "tracker", label: "PRICE TRACK", text: "Make a minion that checks product prices every 5 hours." },
    { id: "summarize", label: "SUMMARIZE", text: "Make a minion that summarizes chats into a clean note." },
    { id: "timezone", label: "TIMEZONE", text: "Create a minion that converts timezones on command." },
    { id: "advice", label: "ADVICE", text: "Make a minion that gives random advice or affirmations." },
    { id: "episode", label: "TRACK EPISODE", text: "Make a minion that tracks new episodes of a show." }
  ];

  const recentMessages = messages.slice(-4);

  return (
    <>
      <ScreenHead title="Forge" subtitle="Create a helper from plain English." />
      <div className="scroll">
        <section className="card chat-card expanded">
          <p className="kicker">Forge your minion
            {messages.length > 0 ? <button className="tiny" type="button" style={{ float: "right" }} onClick={clearMessages}>Clear</button> : null}
          </p>
          <div className="chips">
          {templateChips.map((chip) => (
            <button key={chip.id} type="button" className="chip" onClick={() => sendMessage(chip.text)}>
              {chip.label}
            </button>
          ))}
          </div>
          <div className="chat-log" id="forgeChat">
            {recentMessages.map((message) => (
              <React.Fragment key={message.id}>
                <Bubble message={message} />
                {message.suggestions?.length ? (
                  <div className="suggest">
                    {message.suggestions.map((s, i) => {
                      const label = typeof s === "string" ? s : s.label;
                      return <button key={label || i} type="button" onClick={() => sendMessage(s)}>{label}</button>;
                    })}
                  </div>
                ) : null}
              </React.Fragment>
            ))}
            {sending ? <LoadingDots /> : null}
          </div>
          <div className="input-row">
            <textarea
              className="input"
              id="forgeChatInput"
              rows={1}
              value={composerText}
              placeholder="Summon a minion to..."
              onChange={(event) => setComposerText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage(composerText);
                }
              }}
            />
            <button className="primary" type="button" onClick={() => sendMessage(composerText)}>
              Forge
            </button>
          </div>
        </section>

        <section className="card config">
          <p className="kicker">Required details</p>
          <div className="config">
            <div className="config-row"><span>Template</span><b>{draft.name || "Not selected"}</b></div>
            <div className="config-row"><span>Mode</span><b>{draft.triggerType === "automatic" ? "Automatic" : "Manual"}</b></div>
            <div className="config-row"><span>Channel</span><b>{formatSocialLabel(draft.targetSocial || "private")}</b></div>
            <div className="config-row"><span>Approval</span><b>{draft.safetyMode === "ask_first" ? "Required" : "Optional"}</b></div>
          </div>
        </section>

        <div className="section-row">
          <h3>Your Past Summons</h3>
          <button className="tiny" type="button" onClick={runDraftTest}>History</button>
        </div>
        <section className="past-pane">
          <div className="contained-list">
            {visibleSummons.map((minion) => (
              <article key={minion.id} className="summon-card">
                <div className="avatar">
                  {minion.avatar || <AppIcon name={minion.icon} />}
                </div>
                <div>
                  <h4 className="name">{minion.name}</h4>
                  <p className="task">{minion.commandName || "!hades <follow-up>"}</p>
                  <div className="meta-mini">
                    <span className="meta-pill">{toTitleCase(minion.triggerType || "manual")}</span>
                    <span className="meta-pill">{formatSocialLabel(minion.targetSocial)}</span>
                  </div>
                </div>
                <button className="detail-btn" type="button" onClick={() => openMinionDetail(minion.id)}>
                  Detail
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function LockedPreviewScreen({ title, icon, description }) {
  return (
    <>
      <ScreenHead title={title} subtitle="Locked future preview." />
      <section className="card chat-card">
        <p className="kicker">Locked preview</p>
        <h3 className="bigline">{title} is not part of the MVP.</h3>
        <p className="task">{description}</p>
      </section>
    </>
  );
}

function HadesRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app/minions" replace />} />
      <Route element={<AppShell />}>
        <Route path="app/home" element={<Navigate to="/app/minions" replace />} />
        <Route path="app/minions" element={<MinionsScreen />} />
        <Route path="app/socials" element={<SocialsScreen />} />
        <Route path="app/inbox" element={<InboxScreen />} />
        <Route path="app/settings" element={<SettingsScreen />} />
        <Route path="forge" element={<ForgeScreen />} />
        <Route path="market" element={<LockedPreviewScreen title="Marketplace" icon="market" description="Creator minions, credits, skins, and rentals unlock later." />} />
        <Route path="creator" element={<LockedPreviewScreen title="Creator" icon="palette" description="Creator publishing is not in the MVP." />} />
        <Route path="business" element={<LockedPreviewScreen title="Business" icon="building" description="Business workspaces and approvals unlock later." />} />
        <Route path="admin" element={<LockedPreviewScreen title="Admin" icon="locked" description="Admin tools are locked preview-only." />} />
      </Route>
      <Route path="*" element={<Navigate to="/app/minions" replace />} />
    </Routes>
  );
}

export function HadesPrototypeApp() {
  React.useEffect(() => {
    document.body.classList.add("hades-active");
    return () => document.body.classList.remove("hades-active");
  }, []);

  return (
    <HadesProvider>
      <BrowserRouter>
        <HadesRoutes />
      </BrowserRouter>
    </HadesProvider>
  );
}


