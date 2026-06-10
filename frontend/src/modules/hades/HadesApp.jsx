import React from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
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
  Send,
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
import { buildAssistantReply, buildTestOutput, missingDraftFields } from "./parser.js";
import {
  buildLocalDraftFallback,
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
  discord: Plug2,
  telegram: Send,
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
  const timersRef = React.useRef([]);
  const toastTimerRef = React.useRef(null);

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme;
    writeJson("hades.theme", theme);
  }, [theme]);

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

  const appendMessage = React.useCallback((message) => {
    setMessages((current) => [...current, message]);
  }, [setMessages]);

  const applyTheme = React.useCallback((nextTheme) => {
    setThemeState(nextTheme);
    showToast(`${THEME_CHOICES.find((choice) => choice.id === nextTheme)?.label || nextTheme} applied.`);
  }, [showToast]);

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

    try {
      const response = await postHadesAssignment({
        minionId: minion.id,
        socialLinkId: social?.id || null,
        commandName: assignmentCommand.trim() || minion.commandName || draft.commandName || null,
        idempotencyKey: createId("assignment")
      });

      setAssignments((current) => [...current, response.assignment]);
      pushInbox("socials", "Minion assigned", `${minion.name} is now assigned to ${social?.displayName || "a social placeholder"}.`, "info");
      appendMessage({
        id: createId("msg"),
        role: "assistant",
        content: `${minion.name} assigned to ${social?.displayName || "the selected social"} as a preview. ${social?.status === "connected" ? "That connection is live." : "The connection is not live yet."}`,
        status: "completed"
      });
      showToast(`${minion.name} assigned.`);
      setAssignmentCommand("");
    } catch {
      const assignment = {
        id: createId("assignment"),
        userId: "local-user",
        minionId: minion.id,
        socialLinkId: social?.id || null,
        scope: social?.provider === "private" ? "private" : "social",
        commandName: assignmentCommand.trim() || minion.commandName || draft.commandName || null,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setAssignments((current) => [...current, assignment]);
      pushInbox("socials", "Minion assigned", `${minion.name} is now assigned to ${social?.displayName || "a social placeholder"}.`, "info");
      appendMessage({
        id: createId("msg"),
        role: "assistant",
        content: `${minion.name} assigned to ${social?.displayName || "the selected social"} as a preview. ${social?.status === "connected" ? "That connection is live." : "The connection is not live yet."}`,
        status: "completed"
      });
      showToast(`${minion.name} assigned.`);
      setAssignmentCommand("");
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
  const { toast, assignments, minions, draft, levelState } = useHades();
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
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark"><AppIcon name={icon} size={20} strokeWidth={2.4} /></div>
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      {actionLabel ? (
        <button className="tiny-btn" onClick={onAction}>
          {actionLabel}
        </button>
      ) : (
        <div className="top-actions" />
      )}
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
  const { selectedMinionId, setSelectedMinionId } = useHades();

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
        <button className="btn ghost" type="button" onClick={() => setSelectedMinionId(minion.id)}>
          Select
        </button>
      </div>
    </article>
  );
}

function SocialCard({ social }) {
  const { assignments, setSelectedSocialId, minions } = useHades();
  const assigned = assignments.filter((entry) => entry.socialLinkId === social.id);
  const slotUsage = `${assigned.length} / 3 slots`;
  const assignedNames = assigned.map((entry) => minions.find((minion) => minion.id === entry.minionId)?.name || entry.minionId);
  const emptyCopy = social.status === "locked" ? "Locked preview." : "No assigned minion yet.";

  return (
    <article className="social-card">
      <div className="social-top">
        <div className="avatar"><AppIcon name={getSocialIcon(social.provider)} /></div>
        <div>
          <h4>{social.displayName}</h4>
          <p>{assigned.length ? assignedNames.join(", ") : emptyCopy}</p>
        </div>
        <span className={`badge ${social.status === "connected" ? "active" : social.status === "locked" ? "locked" : ""}`}>
          {social.status === "connected" ? "Connected" : social.status === "locked" ? "Locked" : "Preview"}
        </span>
      </div>
      <div className="subrow">
        <div className="slot">
          <b>Connection</b>
          {social.status === "connected" ? "Live preview" : "Not connected"}
        </div>
        <div className="slot">
          <b>Slots</b>
          {slotUsage}
        </div>
      </div>
      {assigned.length ? (
        <div className="subrow">
          {assigned.map((entry) => (
            <div key={entry.id} className="slot">
              <b>Assigned</b>
              {minions.find((minion) => minion.id === entry.minionId)?.name || entry.minionId}
            </div>
          ))}
        </div>
      ) : null}
      <div style={{ marginTop: 10 }}>
        <button className="btn ghost" type="button" onClick={() => setSelectedSocialId(social.id)}>
          Select
        </button>
      </div>
    </article>
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
  const { minions } = useHades();
  const navigate = useNavigate();

  return (
    <>
      <ScreenHeader icon="minions" title="Minions" subtitle="Inventory, slots, and locked previews." actionLabel="+ Create" onAction={() => navigate("/app/home")} />
      <LevelCard />
      <SectionTitle title="Owned minions" subtitle={`${minions.length} owned`} />
      <div className="minion-list">
        {minions.map((minion) => (
          <MinionCard key={minion.id} minion={minion} />
        ))}
      </div>
      <SectionTitle title="Locked previews" subtitle="Future minions" />
      <div className="quick-grid">
        <button className="card locked" type="button">
          <div className="icon"><AppIcon name="cat" /></div>
          <h4>Cat Meme</h4>
          <p>Command minion for Discord or Telegram.</p>
        </button>
        <button className="card locked" type="button">
          <div className="icon"><AppIcon name="chat" /></div>
          <h4>Meeting Notes</h4>
          <p>Transcribe and summarize later.</p>
        </button>
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
    assignmentCommand,
    setAssignmentCommand
  } = useHades();

  return (
    <>
      <ScreenHeader icon="socials" title="Social Links" subtitle="Assign minions to places they can work." actionLabel="Connect" onAction={() => null} />
      <article className="hero-card">
        <div className="eyebrow">
          <span className="pulse" />
          Social placeholders
        </div>
        <h2>Keep the first assignment simple.</h2>
        <p>For MVP, socials are safe placeholders. You can assign minions and command names before live Discord or Telegram deployment exists.</p>
      </article>

      <div className="social-list">
        {SOCIAL_LINKS.map((social) => (
          <SocialCard key={social.id} social={social} />
        ))}
      </div>

      <SectionTitle title="Assign a minion" subtitle="Preview assignment" />
      <section className="panel" style={{ padding: 14 }}>
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

function ForgePreviewScreen() {
  return (
    <>
      <ScreenHeader icon="hammer" title="Private Forge" subtitle="Founder-only tools stay minimal in MVP." />
      <article className="hero-card">
        <div className="eyebrow">
          <span className="pulse" />
          Founder's layer
        </div>
        <h2>Minimal, private, and intentionally hidden.</h2>
        <p>The Forge preview is visible for context but does not dominate the user flow.</p>
      </article>
      <div className="alert-list">
        <AlertCard alert={{ id: "forge-tools", icon: "github", title: "GitHub task packet helper", description: "Preview only. Manual automation stays locked.", status: "info" }} />
        <AlertCard alert={{ id: "forge-logs", icon: "task", title: "Task logs", description: "Task logs and worker traces are preview-only in MVP.", status: "info" }} />
        <AlertCard alert={{ id: "forge-locks", icon: "locked", title: "Workers and approvals", description: "Execution, approvals, and deploys unlock later.", status: "locked" }} />
      </div>
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
        <Route path="forge" element={<ForgePreviewScreen />} />
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
