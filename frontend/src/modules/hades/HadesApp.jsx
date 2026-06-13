import React from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider.jsx";
import {
  Bot,
  Building2,
  Cat,
  Hammer,
  Home,
  Inbox,
  Mail,
  MessageSquareText,
  Palette,
  Plug2,
  GitFork,
  Settings2,
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
  getHadesBootstrap,
  mapBootstrapToHadesState,
  postHadesAssignment,
  postHadesChat,
  postHadesMinion,
  postHadesMinionTest
} from "./hadesApi.js";

const HadesContext = React.createContext(null);

const ICONS = {
  home: Home,
  minions: Bot,
  socials: Plug2,
  inbox: Inbox,
  settings: Settings2,
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

  async function sendMessage(messageText) {
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

    try {
      const response = await postHadesChat({
        conversationId: conversationId || undefined,
        clientMessageId: userMessageId,
        idempotencyKey: userMessageId,
        message: text,
        currentDraft: draft
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
        composerText,
        setComposerText,
        sendMessage,
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
  const { toast, assignments, minions, draft, levelState, detailMinionId, closeMinionDetail, notifications, notificationOpen } = useHades();
  const screen = getScreenFromPath(location.pathname);
  const activeAssignments = assignments.filter((entry) => entry.socialLinkId === "discord");
  const currentDraft = draft.name ? draft : null;

  return (
    <div className="app">
      <div className="embers" aria-hidden="true">
        <span className="ember" />
        <span className="ember" />
        <span className="ember" />
        <span className="ember" />
        <span className="ember" />
        <span className="ember" />
        <span className="ember" />
      </div>

      <div className="desktop-shell">
        <aside className="desktop-rail">
          <div className="brand" style={{ marginBottom: 18 }}>
            <div className="brand-mark">H</div>
            <div>
              <h1>Hades OS</h1>
              <p>Founder MVP</p>
            </div>
          </div>

          <button className={`rail-item ${screen === "home" ? "active" : ""}`} onClick={() => navigate("/app/home")}>
            <AppIcon name="home" />
            <span>Home</span>
          </button>
          <button className={`rail-item ${screen === "minions" ? "active" : ""}`} onClick={() => navigate("/app/minions")}>
            <AppIcon name="minions" />
            <span>Minions</span>
          </button>
          <button className={`rail-item ${screen === "socials" ? "active" : ""}`} onClick={() => navigate("/app/socials")}>
            <AppIcon name="socials" />
            <span>Socials</span>
          </button>
          <button className={`rail-item ${screen === "inbox" ? "active" : ""}`} onClick={() => navigate("/app/inbox")}>
            <AppIcon name="inbox" />
            <span>Inbox</span>
          </button>
          <button className={`rail-item ${screen === "settings" ? "active" : ""}`} onClick={() => navigate("/app/settings")}>
            <AppIcon name="settings" />
            <span>Settings</span>
          </button>

          <div style={{ height: 12 }} />
          <div className="panel" style={{ padding: 14 }}>
            <div className="eyebrow">
              <span className="pulse" />
              Private Forge
            </div>
            <p className="muted" style={{ fontSize: 12 }}>
              Founder-only dev tools are visible but intentionally light in MVP.
            </p>
            <button className="btn secondary full" style={{ marginTop: 10 }} onClick={() => navigate("/forge")}>
              Open Forge
            </button>
          </div>
        </aside>

        <section className="frame">
          <div className="screen active">
            <Outlet />
          </div>

          <nav className="bottom-nav">
            {MOBILE_NAV.map((item) => (
              <button key={item.id} className={`nav-btn ${screen === item.id ? "active" : ""}`} onClick={() => navigate(item.to)}>
                <AppIcon name={item.icon} />
                {item.label}
              </button>
            ))}
          </nav>

          <NotificationDropdown />

          {detailMinionId ? <MinionDetailView minionId={detailMinionId} onClose={closeMinionDetail} /> : null}

          <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
        </section>

        <aside className="desktop-panel">
          <h3>Live preview</h3>
          <article className="minion">
            <div className="minion-top">
              <div className="avatar"><AppIcon name={currentDraft?.category === "chat" ? "chat" : currentDraft?.category === "shopping" ? "shopping" : currentDraft?.category === "dev" ? "github" : "task"} /></div>
              <div>
                <h4>{currentDraft?.name || "No draft yet"}</h4>
                <p>{currentDraft?.description || "Create a minion through chat."}</p>
              </div>
              <span className={`badge ${currentDraft?.status === "ready_to_test" ? "active" : ""}`}>
                {currentDraft?.status === "ready_to_test" ? "Ready" : "Draft"}
              </span>
            </div>
            <div className="subrow">
              <div className="slot">
                <b>Where</b>
                {formatSocialLabel(currentDraft?.targetSocial || "private")}
              </div>
              <div className="slot">
                <b>Trigger</b>
                {currentDraft?.triggerType || "Not set"}
              </div>
            </div>
          </article>

          <article className="social-card">
            <div className="social-top">
              <div className="avatar"><AppIcon name="socials" /></div>
              <div>
                <h4>Discord</h4>
                <p>{activeAssignments.length ? `${activeAssignments.map((entry) => minions.find((minion) => minion.id === entry.minionId)?.name).filter(Boolean).join(", ")}` : "No assigned minion yet."}</p>
              </div>
              <span className="badge locked">Preview</span>
            </div>
          </article>

          <article className="alert">
            <div className="alert-top">
              <div className="avatar"><AppIcon name="sparkles" /></div>
              <div>
                <h4>{levelState.title}</h4>
                <p>Level {levelState.level} preview with {Math.min(minions.length, levelState.level)} active slot(s).</p>
              </div>
            </div>
          </article>

          {LOCKED_PREVIEWS.map((entry) => (
            <article key={entry.id} className="alert">
              <div className="alert-top">
                <div className="avatar"><AppIcon name={entry.icon} /></div>
                <div>
                  <h4>{entry.title}</h4>
                  <p>{entry.description}</p>
                </div>
                <span className="badge locked">Locked</span>
              </div>
            </article>
          ))}
        </aside>
      </div>
    </div>
  );
}

function ScreenHeader({ icon, title, subtitle, actionLabel, onAction }) {
  const { toggleNotificationDropdown } = useHades();

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark"><AppIcon name={icon} size={20} strokeWidth={2.4} /></div>
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="top-actions">
        <button className="icon-btn" type="button" onClick={toggleNotificationDropdown} aria-label="Toggle notifications">
          <AppIcon name="inbox" size={16} />
        </button>
        {actionLabel ? (
          <button className="tiny-btn" type="button" onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>
    </header>
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

function LevelCard() {
  const { levelState, minions } = useHades();
  const unlocked = levelState.level >= 2;

  return (
    <section className="level-card panel">
      <div className="level-badge">{levelState.level}</div>
      <div>
        <div className="space">
          <h4>{levelState.title}</h4>
          <span className="badge">{Math.min(minions.length, levelState.level)} / {levelState.level} active</span>
        </div>
        <p className="muted" style={{ fontSize: 12 }}>
          {unlocked ? "Unlocked: second minion slot preview." : "Next unlock: second minion slot."}
        </p>
        <div className={`bar ${unlocked ? "level2" : ""}`}>
          <span />
        </div>
      </div>
    </section>
  );
}

function Bubble({ message }) {
  const { sendMessage } = useHades();
  const className = `bubble ${message.role === "user" ? "user" : "hermes"} ${message.status === "queued" ? "pending" : ""}`;

  return (
    <div className={className}>
      <span dangerouslySetInnerHTML={{ __html: message.content }} />
      {message.status === "queued" ? <small>Pending sync</small> : null}
      {message.suggestions?.length ? (
        <div className="suggestions" style={{ marginTop: 8 }}>
          {message.suggestions.map((suggestion) => (
            <button key={suggestion} className="suggestion" type="button" onClick={() => sendMessage(suggestion)}>
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
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
  const { selectedMinionId, setSelectedMinionId, openMinionDetail } = useHades();

  return (
    <article className={`minion ${selectedMinionId === minion.id ? "selected" : ""}`}>
      <div className="minion-top">
        <div className="avatar"><AppIcon name={minion.icon} /></div>
        <div>
          <h4>{minion.name}</h4>
          <p>{minion.description}</p>
        </div>
        <span className={`badge ${minion.status === "active" ? "active" : "locked"}`}>
          {minion.status === "active" ? "Active" : "Locked"}
        </span>
      </div>
      <div className="subrow">
        <div className="slot">
          <b>Scope</b>
          {formatSocialLabel(minion.targetSocial)}
        </div>
        <div className="slot">
          <b>Trigger</b>
          {toTitleCase(minion.triggerType)}
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <div className="draft-actions">
          <button className="btn ghost" type="button" onClick={() => setSelectedMinionId(minion.id)}>
            Select
          </button>
          <button className="btn secondary" type="button" onClick={() => openMinionDetail(minion.id)}>
            Detail
          </button>
        </div>
      </div>
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
  const view = buildNotificationViewModel(notifications);
  const visible = tab === "manual" ? view.manual : view.automated;

  return (
    <aside className={`notification-menu ${notificationOpen ? "open" : ""}`} aria-hidden={!notificationOpen}>
      <div className="space" style={{ marginBottom: 10 }}>
        <strong style={{ color: "var(--text)" }}>Notifications</strong>
        <button className="tiny-btn" type="button" onClick={toggleNotificationDropdown}>
          Close
        </button>
      </div>
      <div className="tabs">
        <button type="button" className={`tab ${tab === "manual" ? "active" : ""}`} onClick={() => setTab("manual")}>
          Manual
        </button>
        <button type="button" className={`tab ${tab === "automated" ? "active" : ""}`} onClick={() => setTab("automated")}>
          Auto
        </button>
      </div>
      <div className="notification-log-scroll">
        {visible.map((entry) => (
          <article key={entry.id} className="notification-item">
            <div className="space" style={{ alignItems: "start" }}>
              <div>
                <h4>{entry.label || "Notification"}</h4>
                <p>{entry.locationLabel}</p>
              </div>
              <span className="badge">{entry.mode === "automated" ? "Auto" : "Manual"}</span>
            </div>
            <div className="draft-actions">
              <button className="btn secondary" type="button" onClick={() => openMinionDetail(entry.minionId || "task-helper")}>
                Open detail
              </button>
              <button className="btn ghost" type="button" onClick={() => setNotificationOpen(false)}>
                Close
              </button>
            </div>
          </article>
        ))}
        {!visible.length ? <p className="muted" style={{ margin: 0, fontSize: 12 }}>No notifications yet.</p> : null}
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
      <div className="space" style={{ marginBottom: 10 }}>
        <strong style={{ color: "var(--text)" }}>Minion Detail</strong>
        <button className="tiny-btn" type="button" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="detail-scroll">
        <section className="panel" style={{ padding: 14 }}>
          <div className="minion-top">
            <div className="avatar"><AppIcon name={detail.icon} /></div>
            <div>
              <h4>{detail.name}</h4>
              <p>{detail.plainDescription.split("\n")[0]}</p>
            </div>
            <span className="badge active">{detail.statusMode.statusLabel}</span>
          </div>
          <div className="subrow">
            <div className="slot">
              <b>Mode</b>
              {detail.statusMode.modeLabel}
            </div>
            <div className="slot">
              <b>Destination</b>
              {detail.statusMode.destinationLabel}
            </div>
          </div>
          <div className="slot" style={{ marginTop: 10 }}>
            <b>Source / Channel</b>
            {detail.sourceLabel}
          </div>
        </section>

        <section className="panel" style={{ padding: 14, marginTop: 10 }}>
          <div className="eyebrow">Destination Preview</div>
          <div className="preview-card">
            <strong>{detail.destinationPreview.title}</strong>
            <p>{detail.destinationPreview.label}</p>
            {detail.destinationPreview.previewMessages.map((line, index) => (
              <div key={`${line.sender}-${index}`} className="preview-line">
                <span>{line.sender}</span>
                <p>{line.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel" style={{ padding: 14, marginTop: 10 }}>
          <div className="eyebrow">Command Syntax</div>
          <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>{detail.commandSyntax}</p>
          <div className="eyebrow">Plain Description</div>
          <p style={{ whiteSpace: "pre-line", color: "var(--muted)", fontSize: 12, lineHeight: 1.5 }}>{detail.plainDescription}</p>
        </section>

        <section className="panel" style={{ padding: 14, marginTop: 10 }}>
          <div className="eyebrow">Activity Log</div>
          <div className="activity-log-scroll">
            {(detail.activityLog.length ? detail.activityLog : [
              { id: "activity-1", title: "Created", createdAt: "Jun 13, 2026 · 9:12 AM", location: "Hades Chat" },
              { id: "activity-2", title: "Test run", createdAt: "Jun 13, 2026 · 9:18 AM", location: "Discord #cat-chaos" }
            ]).map((entry) => (
              <article key={entry.id} className="notification-item">
                <h4>{entry.title}</h4>
                <p>{entry.location}</p>
                <span className="badge">{entry.createdAt}</span>
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

function HomeScreen() {
  const { messages, selectStarterCard, sendMessage, selectedStarterId } = useHades();
  const navigate = useNavigate();

  return (
    <>
      <ScreenHeader icon="sparkles" title="Hades OS" subtitle="Ask Hades. Build minions. Assign them anywhere." actionLabel="Forge" onAction={() => navigate("/forge")} />
      <article className="hero-card">
        <div className="eyebrow">
          <span className="pulse" />
          Mobile-first minion builder
        </div>
        <h2>
          Your <span className="gradient-text">forge</span> for simple automation.
        </h2>
        <p>Your mobile-first automation companion. Chat naturally, create a minion, test it, then assign it to a social link.</p>
      </article>

      <LevelCard />

      <SectionTitle title="Start with Hades" subtitle="Natural language minion builder" />
      <section className="panel" style={{ padding: 14 }}>
        <div className="chat-wrap" id="homeChat">
          {messages.map((message) => (
            <Bubble key={message.id} message={message} />
          ))}
        </div>
        <div className="suggestions">
          {STARTER_PROMPTS.map((prompt) => (
            <button key={prompt.id} className="suggestion" type="button" onClick={() => sendMessage(prompt.text)}>
              <AppIcon name={prompt.icon} size={16} /> {prompt.label}
            </button>
          ))}
        </div>
        <ChatComposer />
        <DraftCard />
      </section>

      <SectionTitle title="Starter minions" subtitle="Limited to avoid overload" />
      <div className="quick-grid">
        {STARTER_MINIONS.map((starter) => (
          <button
            key={starter.id}
            type="button"
            className={`card ${starter.status === "locked" ? "locked" : ""} ${starter.id === selectedStarterId ? "selected" : ""}`}
            onClick={() => selectStarterCard(starter.id)}
          >
            <div className="icon"><AppIcon name={starter.icon} /></div>
            <h4>{starter.name}</h4>
            <p>{starter.description}</p>
          </button>
        ))}
        <button type="button" className="card locked" onClick={() => selectStarterCard("task-helper")}>
          <div className="icon"><AppIcon name="market" /></div>
          <h4>Market Minions</h4>
          <p>Browse popular creator minions later.</p>
        </button>
      </div>
    </>
  );
}

function MinionsScreen() {
  const { minions, messages, sendMessage, composerText, setComposerText, draft, openMinionDetail } = useHades();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState("active");
  const view = buildMinionScreenViewModel({ minions });
  const visibleMinions = activeTab === "active" ? view.active : view.inactive;

  return (
    <>
      <ScreenHeader icon="minions" title="Minions" subtitle="Speak to Hades, then inspect your minions and slots." actionLabel="+ Create" onAction={() => navigate("/app/home")} />
      <LevelCard />

      <SectionTitle title="Speak to Hades" subtitle="Natural language minion builder" />
      <section className="panel" style={{ padding: 14 }}>
        <div className="chat-wrap" id="minionsChat">
          {messages.slice(-3).map((message) => (
            <Bubble key={message.id} message={message} />
          ))}
        </div>
        <div className="suggestions">
          <button className="suggestion" type="button" onClick={() => sendMessage("Make a command called !sendcat that sends cat memes in Discord.")}>
            <AppIcon name="cat" size={16} /> Cat memes
          </button>
          <button className="suggestion" type="button" onClick={() => sendMessage("Create a minion that summarizes chats and drafts the result.")}>
            <AppIcon name="chat" size={16} /> Chat summarizer
          </button>
        </div>
        <div className="composer">
          <textarea
            id="minionsChatInput"
            rows={1}
            value={composerText}
            placeholder="Ask Hades to forge or adjust a minion..."
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
      </section>

      <SectionTitle title="Your Minions" subtitle={`${minions.length} owned`} />
      <section className="panel" style={{ padding: 14 }}>
        <div className="tabs">
          <button type="button" className={`tab ${activeTab === "active" ? "active" : ""}`} onClick={() => setActiveTab("active")}>
            Active
          </button>
          <button type="button" className={`tab ${activeTab === "inactive" ? "active" : ""}`} onClick={() => setActiveTab("inactive")}>
            Inactive
          </button>
        </div>
        <div className="minion-list-scroll">
          {visibleMinions.map((minion) => (
            <MinionCard key={minion.id} minion={minion} />
          ))}
          {!visibleMinions.length ? (
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              No {activeTab} minions yet.
            </p>
          ) : null}
        </div>
      </section>

      <SectionTitle title="Minion Slots" subtitle="Compact inventory" />
      <div className="quick-grid">
        {view.slots.map((slot) => (
          <button key={slot.id} type="button" className={`card ${slot.commandSyntax ? "" : "locked"}`} onClick={() => slot.id.startsWith("empty") ? navigate("/forge") : openMinionDetail(slot.id)}>
            <div className="icon"><AppIcon name={slot.commandSyntax ? "sparkles" : "locked"} /></div>
            <h4>{slot.name}</h4>
            <p>{slot.commandSyntax || "Empty Slot"}</p>
          </button>
        ))}
      </div>
    </>
  );
}

function SocialsScreen() {
  const {
    selectedMinionId,
    selectedSocialId,
    setSelectedMinionId,
    setSelectedSocialId,
    minions,
    draft,
    assignSelectedMinion,
    assignSelectedMinionToAllConnected,
    assignmentCommand,
    setAssignmentCommand
  } = useHades();

  return (
    <>
      <ScreenHeader icon="socials" title="Social Links" subtitle="Assign minions to connected bots." actionLabel="Assign all" onAction={assignSelectedMinionToAllConnected} />
      <section className="panel socials-rail" style={{ padding: 14 }}>
        <div className="socials-toolbar">
          <div>
            <h3>Assign to all</h3>
            <p>Send the selected minion to every connected social runtime.</p>
          </div>
          <button className="btn secondary" type="button" onClick={assignSelectedMinionToAllConnected}>
            Assign to all
          </button>
        </div>
      </section>

      <div className="social-list">
        {SOCIAL_LINKS.map((social) => (
          <SocialCard key={social.id} social={social} />
        ))}
      </div>

      <SectionTitle title="Assign a minion" subtitle="Preview assignment" />
      <section className="panel socials-rail" style={{ padding: 14 }}>
        <div className="assign-panel">
          <select className="selectish" value={selectedMinionId} onChange={(event) => setSelectedMinionId(event.target.value)}>
            {minions.map((minion) => (
              <option key={minion.id} value={minion.id}>
                {minion.name}
              </option>
            ))}
          </select>
          <select className="selectish" value={selectedSocialId} onChange={(event) => setSelectedSocialId(event.target.value)}>
            {SOCIAL_LINKS.map((social) => (
              <option key={social.id} value={social.id}>
                {social.displayName}
              </option>
            ))}
          </select>
          <input
            className="inputish"
            placeholder="Command name if needed"
            value={assignmentCommand || draft.commandName || ""}
            onChange={(event) => setAssignmentCommand(event.target.value)}
          />
          <button className="btn" type="button" onClick={assignSelectedMinion}>
            Assign
          </button>
        </div>
      </section>
    </>
  );
}

function InboxScreen() {
  const { inbox } = useHades();

  return (
    <>
      <ScreenHeader icon="inbox" title="Inbox" subtitle="Pending sync notifications and test results." />
      <article className="hero-card">
        <div className="eyebrow">
          <span className="pulse" />
          Inbox preview
        </div>
        <h2>Keep the user loop visible.</h2>
        <p>Hades sends alerts for save, test, assignment, and locked future feature notices.</p>
      </article>
      <div className="alert-list">
        {inbox.map((alert) => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
      </div>
    </>
  );
}

function SettingsScreen() {
  const { futurePlanCache, futurePlanDraft, setFuturePlanDraft, cacheFuturePlan, clearFuturePlans } = useHades();
  const { signOut } = useAuth();

  const handleLogout = React.useCallback(async () => {
    await signOut();
  }, [signOut]);

  return (
    <>
      <ScreenHeader icon="settings" title="Settings" subtitle="Theme, profile card, and future route previews." />
      <section className="profile-card">
        <div className="profile-top">
          <div className="pfp">H</div>
          <div>
            <h3>Founder / Player</h3>
            <p>Ember Forge default profile with private Forge access.</p>
            <div className="chips" style={{ marginTop: 8 }}>
              <span className="chip"><AppIcon name="sparkles" size={14} /> Ember Forge</span>
              <span className="chip"><AppIcon name="private" size={14} /> Private Forge</span>
            </div>
          </div>
        </div>
      </section>

      <SectionTitle title="Appearance" subtitle="Theme switcher" />
      <div className="theme-grid">
        {THEME_CHOICES.map((choice) => (
          <ThemeCard key={choice.id} choice={choice} />
        ))}
      </div>

      <SectionTitle title="Session" subtitle="Local auth controls" />
      <section className="panel" style={{ padding: 14 }}>
        <div className="space" style={{ marginBottom: 10 }}>
          <div>
            <h4 style={{ margin: 0, color: "var(--text)" }}>Signed in session</h4>
            <p className="muted" style={{ marginTop: 4, fontSize: 12 }}>
              Logout clears the Supabase session bridge and returns you to the login surface.
            </p>
          </div>
          <button className="btn secondary" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </section>

      <SectionTitle title="Future plan cache" subtitle="Local notes for the next phase" />
      <section className="panel" style={{ padding: 14 }}>
        <div className="assign-panel" style={{ gridTemplateColumns: "1fr" }}>
          <textarea
            className="inputish"
            style={{ minHeight: 84, resize: "vertical" }}
            placeholder="Cache a next-step plan locally..."
            value={futurePlanDraft}
            onChange={(event) => setFuturePlanDraft(event.target.value)}
          />
          <div className="draft-actions" style={{ marginTop: 0 }}>
            <button className="btn" type="button" onClick={cacheFuturePlan}>
              Cache note
            </button>
            <button className="btn secondary" type="button" onClick={clearFuturePlans}>
              Clear cache
            </button>
          </div>
        </div>
        <div className="alert-list" style={{ marginTop: 12 }}>
          {futurePlanCache.length ? futurePlanCache.map((entry) => (
            <article key={entry.id} className="alert">
              <div className="alert-top">
                <div className="avatar"><AppIcon name="sparkles" /></div>
                <div>
                  <h4>{entry.title}</h4>
                  <p>{entry.description}</p>
                </div>
              </div>
            </article>
          )) : (
            <p className="muted" style={{ fontSize: 12, margin: 0 }}>
              No cached plan notes yet.
            </p>
          )}
        </div>
      </section>

      <SectionTitle title="Future previews" subtitle="Locked routes" />
      <div className="quick-grid">
        <button className="card locked" type="button">
          <div className="icon"><AppIcon name="sparkles" /></div>
          <h4>Casual</h4>
          <p>Minions, socials, inbox, market.</p>
        </button>
        <button className="card locked" type="button">
          <div className="icon"><AppIcon name="hammer" /></div>
          <h4>Developer</h4>
          <p>Repos, tasks, workers, approvals.</p>
        </button>
        <button className="card locked" type="button">
          <div className="icon"><AppIcon name="palette" /></div>
          <h4>Creator</h4>
          <p>Publish minions and skins.</p>
        </button>
        <button className="card locked" type="button">
          <div className="icon"><AppIcon name="building" /></div>
          <h4>Business</h4>
          <p>Teams, integrations, approvals.</p>
        </button>
      </div>
    </>
  );
}

function ForgeScreen() {
  const { messages, draft, composerText, setComposerText, sendMessage, runDraftTest, saveDraft, minions, openMinionDetail } = useHades();
  const templateChips = [
    { id: "sendcat", label: "Send cat", text: "Create a command called !sendcat that sends cat memes in Discord." },
    { id: "summarize", label: "Summarize", text: "Make a minion that summarizes chats into a clean note." },
    { id: "tracker", label: "Track price", text: "Make a minion that checks product prices every 5 hours." }
  ];

  return (
    <>
      <ScreenHeader icon="hammer" title="Forge" subtitle="Forge your minion, test it, and keep past summons visible." actionLabel="Test" onAction={runDraftTest} />
      <article className="hero-card">
        <div className="eyebrow">
          <span className="pulse" />
          Forge your minion
        </div>
        <h2>Shape a minion from a natural request.</h2>
        <p>Use a template chip or describe the task in plain language. Hades fills the draft as you go.</p>
      </article>
      <SectionTitle title="Template chips" subtitle="Quick starts" />
      <div className="chips">
        {templateChips.map((chip) => (
          <button key={chip.id} type="button" className="chip" onClick={() => sendMessage(chip.text)}>
            {chip.label}
          </button>
        ))}
      </div>

      <SectionTitle title="Forge chat" subtitle="Fill missing details" />
      <section className="panel" style={{ padding: 14 }}>
        <div className="chat-wrap" id="forgeChat">
          {messages.slice(-4).map((message) => (
            <Bubble key={message.id} message={message} />
          ))}
        </div>
        <div className="composer">
          <textarea
            id="forgeChatInput"
            rows={1}
            value={composerText}
            placeholder="Describe the minion you want to forge..."
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
        <DraftCard />
        <div className="draft-actions">
          <button className="btn secondary" type="button" onClick={runDraftTest}>
            Test run
          </button>
          <button className="btn secondary" type="button" onClick={saveDraft}>
            Forge minion
          </button>
        </div>
      </section>

      <SectionTitle title="Required details" subtitle="Current draft" />
      <div className="alert-list">
        <AlertCard alert={{ id: "forge-draft", icon: "task", title: draft.name || "No draft yet", description: draft.description || "Type a request to fill the forge draft.", status: draft.status === "saved" ? "success" : "info" }} />
        <AlertCard alert={{ id: "forge-minions", icon: "sparkles", title: "Past summons", description: `${minions.length} saved minion${minions.length === 1 ? "" : "s"} ready to inspect.`, status: "info" }} />
      </div>

      <SectionTitle title="Your Past Summons" subtitle="Bounded scroll panel" />
      <section className="panel" style={{ padding: 14 }}>
        <div className="past-summons-scroll">
          {minions.map((minion) => (
            <article key={minion.id} className="minion">
              <div className="minion-top">
                <div className="avatar"><AppIcon name={minion.icon} /></div>
                <div>
                  <h4>{minion.name}</h4>
                  <p>{minion.description}</p>
                </div>
                <span className={`badge ${minion.status === "active" ? "active" : "locked"}`}>
                  {toTitleCase(minion.triggerType || "manual")}
                </span>
              </div>
              <div className="subrow">
                <div className="slot">
                  <b>Destination</b>
                  {formatSocialLabel(minion.targetSocial)}
                </div>
                <div className="slot">
                  <b>Command</b>
                  {minion.commandName || "!hades"}
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <button className="btn secondary" type="button" onClick={() => openMinionDetail(minion.id)}>
                  Detail
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function LockedPreviewScreen({ title, icon, description }) {
  return (
    <>
      <ScreenHeader icon={icon} title={title} subtitle="Locked future preview." />
      <article className="hero-card">
        <div className="eyebrow">
          <span className="pulse" />
          Locked preview
        </div>
        <h2>{title} is not part of the MVP.</h2>
        <p>{description}</p>
      </article>
    </>
  );
}

function HadesRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app/home" replace />} />
      <Route element={<AppShell />}>
        <Route path="app/home" element={<HomeScreen />} />
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
      <Route path="*" element={<Navigate to="/app/home" replace />} />
    </Routes>
  );
}

export function HadesApp() {
  return (
    <HadesProvider>
      <BrowserRouter>
        <HadesRoutes />
      </BrowserRouter>
    </HadesProvider>
  );
}
