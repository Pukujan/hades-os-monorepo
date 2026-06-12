import { createEmptyDraft, missingDraftFields } from "./data.js";

const SOCIAL_PATTERNS = [
  ["discord", "discord"],
  ["telegram", "telegram"],
  ["github", "github"],
  ["email", "email"],
  ["private", "private"]
];

function normalize(text) {
  return text.trim().replace(/\s+/g, " ");
}

function titleCase(text) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function inferName(message, category, action) {
  const lower = message.toLowerCase();

  if (lower.includes("cat meme") || lower.includes("cat gif")) {
    return "Cat Meme Minion";
  }
  if (lower.includes("summar")) {
    return "Chat Summarizer";
  }
  if (lower.includes("task") || lower.includes("task card") || lower.includes("task helper")) {
    return "Task Helper";
  }
  if (lower.includes("github")) {
    return "GitHub Task Packet Helper";
  }
  if (lower.includes("deal") || lower.includes("price drop") || lower.includes("shopping")) {
    return "Deal Watcher";
  }
  if (lower.includes("email")) {
    return "Email Helper";
  }
  if (action) {
    return `${titleCase(action.replace(/^(send|create|draft|summarize|watch|turn)\s+/i, ""))} Minion`
      .replace(/\s+/g, " ")
      .replace(/ Minion Minion$/, " Minion");
  }
  if (category) {
    return `${titleCase(category)} Minion`;
  }
  return "New Minion";
}

function inferCategory(message) {
  const lower = message.toLowerCase();
  if (lower.includes("cat meme") || lower.includes("funny") || lower.includes("joke")) return "fun";
  if (lower.includes("summar") || lower.includes("chat")) return "chat";
  if (lower.includes("github") || lower.includes("repo") || lower.includes("task packet")) return "dev";
  if (lower.includes("deal") || lower.includes("price") || lower.includes("shopping")) return "shopping";
  if (lower.includes("email")) return "chat";
  if (lower.includes("task") || lower.includes("todo") || lower.includes("to-do")) return "task";
  return null;
}

function inferAction(message) {
  const lower = message.toLowerCase();
  if (lower.includes("cat meme") || lower.includes("cat gif")) return "send a random cat meme GIF";
  if (lower.includes("summar")) return "summarize long chats into clean notes";
  if (lower.includes("task packet")) return "package a GitHub task packet";
  if (lower.includes("task")) return "turn messy instructions into simple task cards";
  if (lower.includes("deal") || lower.includes("price")) return "watch for deals and price drops";
  if (lower.includes("email")) return "draft and organize email responses";
  return null;
}

function inferCommandName(message) {
  const direct = message.match(/(?:called|named|command\s+called)\s+(![a-z0-9_-]+)/i);
  if (direct?.[1]) return direct[1];

  const explicit = message.match(/(![a-z0-9_-]+)/i);
  if (explicit?.[1]) return explicit[1];

  return null;
}

function inferTriggerType(message) {
  const lower = message.toLowerCase();
  if (inferCommandName(message) || lower.includes("command")) return "command";
  if (lower.includes("watch")) return "watcher";
  if (lower.includes("manual")) return "manual";
  return null;
}

function inferSocial(message) {
  const lower = message.toLowerCase();
  for (const [needle, value] of SOCIAL_PATTERNS) {
    if (lower.includes(needle)) return value;
  }
  return null;
}

function shouldTreatAsContinuation(message) {
  const trimmed = normalize(message);
  if (trimmed.length > 42) return false;
  if (/^!/.test(trimmed)) return true;
  if (/^(discord|telegram|github|email|private)$/i.test(trimmed)) return true;
  if (/^[\w-]+$/.test(trimmed) && trimmed.length <= 18) return true;
  return false;
}

export function createDraftFromMessage(message, currentDraft = createEmptyDraft()) {
  const text = normalize(message);
  const useContinuation = currentDraft && currentDraft.status !== "saved" && shouldTreatAsContinuation(text);
  const draft = useContinuation ? { ...createEmptyDraft(), ...currentDraft } : createEmptyDraft();
  const next = { ...draft };
  const lower = text.toLowerCase();

  const category = inferCategory(text);
  const action = inferAction(text);
  const social = inferSocial(text);
  const triggerType = inferTriggerType(text);
  const commandName = inferCommandName(text);

  if (category) next.category = next.category || category;
  if (social) next.targetSocial = social;
  if (triggerType) next.triggerType = triggerType;
  if (commandName) next.commandName = commandName;
  if (action) next.action = next.action || action;

  if (!next.category && next.action) {
    if (next.action.includes("cat meme")) next.category = "fun";
    else if (next.action.includes("summar")) next.category = "chat";
    else if (next.action.includes("task")) next.category = "task";
    else if (next.action.includes("GitHub")) next.category = "dev";
    else if (next.action.includes("deal") || next.action.includes("price")) next.category = "shopping";
    else next.category = "task";
  }

  if (!next.name) {
    next.name = inferName(text, next.category, next.action);
  }

  if (!next.description) {
    next.description =
      next.action ||
      (next.category === "fun"
        ? "Helps with playful social automation."
        : next.category === "dev"
          ? "Helps package GitHub work into useful packets."
          : "Helps turn natural language into a useful minion.");
  }

  if (!next.triggerType && next.commandName) {
    next.triggerType = "command";
  }

  if (!next.triggerType) {
    next.triggerType = next.action ? "manual" : null;
  }

  if (!next.targetSocial && lower.includes("private")) {
    next.targetSocial = "private";
  }
  if (!next.targetSocial && next.action && next.action.includes("GitHub")) {
    next.targetSocial = "github";
  }
  if (!next.targetSocial && next.action && next.action.includes("email")) {
    next.targetSocial = "email";
  }
  if (!next.targetSocial && next.category === "fun") {
    next.targetSocial = "discord";
  }
  if (!next.targetSocial && next.category === "dev") {
    next.targetSocial = "github";
  }
  if (!next.targetSocial && next.category === "chat") {
    next.targetSocial = "private";
  }

  if (!next.commandName && next.triggerType === "command" && inferCommandName(text)) {
    next.commandName = inferCommandName(text);
  }

  if (next.triggerType === "manual" && !next.action && text) {
    next.action = "perform the described task";
  }

  const missing = missingDraftFields(next);
  next.status = missing.length ? "incomplete" : "ready_to_test";
  next.responseStyle = next.responseStyle || "helpful";
  next.safetyMode = next.safetyMode || "ask_first";

  return { draft: next, missing };
}

export function buildAssistantReply(result) {
  const { draft, missing } = result;

  if (missing.length === 0) {
    return {
      content: "Done - I drafted this minion. Want to test it?",
      suggestions: [],
      status: "completed"
    };
  }

  if (missing.includes("command name")) {
    return {
      content: "Nice - I can make that. What command should trigger it?",
      suggestions: ["!catmeme", "!sendcat", "!catgif"],
      status: "completed"
    };
  }

  if (missing.includes("target social")) {
    return {
      content: "Good idea. Where should this minion work first?",
      suggestions: ["Discord", "Telegram", "Private"],
      status: "completed"
    };
  }

  return {
    content: `I still need: ${missing.join(", ")}.`,
    suggestions: draft.triggerType === "command" ? ["!sendcat"] : [],
    status: "completed"
  };
}

export function buildTestOutput(draft) {
  const name = (draft.name || "").toLowerCase();

  if (name.includes("task")) return "messy note converted into 3 clean task cards.";
  if (name.includes("summar")) return "long chat summarized into 5 bullet notes.";
  if (name.includes("cat")) return "random cat meme sent.";
  if (name.includes("github")) return "GitHub task packet compiled successfully.";
  if (name.includes("deal")) return "deal watcher flagged a usable price drop.";
  return "draft executed in simulation.";
}

export function sanitizeAssistantText(text) {
  return String(text)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .trim();
}
