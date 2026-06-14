import { VALID_CATEGORIES, VALID_TARGET_SOCIALS, VALID_TRIGGER_TYPES } from "../data.js";
import { buildGeneralChatPrompt } from "../prompts/generalChatPrompt.js";
import { buildForgeChatPrompt } from "../prompts/forgeChatPrompt.js";
import { HADES_APP_ROUTES } from "../hadesAppContext.js";

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "deepseek/deepseek-v4-flash";

function safeJsonParse(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  const fenced = raw.match(/```json\s*([\s\S]*?)```/i) || raw.match(/```\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() || raw;

  return JSON.parse(candidate);
}

function createSystemPrompt(context = "forge") {
  const isGeneral = context === "general" || context === "minions";
  const jsonKeys = isGeneral
    ? "reply (string), actions (array of {label, route}), sessionId (string)"
    : "assistantText (string), draftPatch (object), missingFields (array of strings), suggestions (array of strings), sessionId (string)";
  const promptBody = isGeneral
    ? buildGeneralChatPrompt({ routes: HADES_APP_ROUTES })
    : buildForgeChatPrompt();
  const constraints = isGeneral ? [] : [
    `Allowed categories: ${VALID_CATEGORIES.join(", ")}.`,
    `Allowed trigger types: ${VALID_TRIGGER_TYPES.join(", ")}.`,
    `Allowed target socials: ${VALID_TARGET_SOCIALS.join(", ")}.`,
    "Keep draftPatch small and only include fields that should change.",
  ];
  return [
    promptBody,
    "",
    `Return only valid JSON with these keys: ${jsonKeys}.`,
    "Do not wrap the JSON in markdown.",
    ...constraints,
  ].join(" ");
}

export function createOpenRouterClient({
  baseUrl = DEFAULT_BASE_URL,
  apiKey,
  model = DEFAULT_MODEL,
  httpReferer = "",
  appTitle = "",
  fetchImpl = fetch
} = {}) {
  async function generateDraft({ userId, conversationId, message, currentDraft, allowedProviders, mode, context = "forge" }) {
    if (!apiKey) {
      throw new Error("OpenRouter client is not configured");
    }

    const response = await fetchImpl(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...(httpReferer ? { "HTTP-Referer": httpReferer } : {}),
        ...(appTitle ? { "X-OpenRouter-Title": appTitle } : {})
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: createSystemPrompt(context)
          },
          {
            role: "user",
            content: JSON.stringify({
              userId,
              conversationId,
              mode,
              allowedProviders,
              currentDraft,
              message
            })
          }
        ]
      })
    });

    const raw = await response.text();
    const body = raw ? JSON.parse(raw) : null;

    if (!response.ok) {
      const error = new Error(body?.error?.message || body?.error || body?.message || `OpenRouter request failed (${response.status})`);
      error.status = response.status;
      throw error;
    }

    const content = body?.choices?.[0]?.message?.content;
    const parsed = typeof content === "string" ? safeJsonParse(content) : content;

    if (!parsed || typeof parsed !== "object") {
      throw new Error("OpenRouter response did not include valid JSON content");
    }

    return parsed;
  }

  return { generateDraft };
}
