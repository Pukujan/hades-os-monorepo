const URL_REGEX = /https?:\/\/[^\s<)>]+/g;

function stripMarkdownLinks(text) {
  return text.replace(/\[([^\]]*)\]\(([^)]*)\)/g, (_, linkText) => linkText);
}

export function extractLinkActionsFromText(text) {
  if (!text) return [];
  const cleaned = stripMarkdownLinks(text);
  const urls = cleaned.match(URL_REGEX);
  if (!urls) return [];
  return urls.filter(Boolean).map((url) => {
    try {
      const hostname = new URL(url).hostname;
      return { type: "external_link", url, label: `Open ${hostname}` };
    } catch {
      return { type: "external_link", url, label: "Open link" };
    }
  });
}

export function normalizeMessageActions(message) {
  if (!message) return message;
  const existingActions = message.actions || [];
  const linkActions = extractLinkActionsFromText(message.content || "");
  const combined = [...existingActions, ...linkActions];
  const seen = new Set();
  const deduped = combined.filter((action) => {
    const key = action.type === "external_link" ? `external_link:${action.url}` : `${action.type}:${action.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { ...message, actions: deduped };
}
