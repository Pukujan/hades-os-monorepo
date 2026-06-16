const HADES_PREFIXES = /^[!/]hades\b/i;

export function parseHadesCommand(content) {
  if (!content || typeof content !== "string") return null;

  const trimmed = content.trim();
  if (!HADES_PREFIXES.test(trimmed)) return null;

  const withoutPrefix = trimmed.replace(HADES_PREFIXES, "").trim();
  if (!withoutPrefix) return { prefix: "!hades", rawArgs: "", action: null };

  const tokens = withoutPrefix.split(/\s+/);

  const result = {
    prefix: trimmed.startsWith("/") ? "/hades" : "!hades",
    rawArgs: withoutPrefix,
    action: tokens[0] || null,
  };

  if (tokens[0] === "summarize" && tokens[1] === "chat" && tokens[2]) {
    result.source = "chat";
    result.count = parseInt(tokens[2], 10);
    if (isNaN(result.count)) delete result.count;
  }

  if (tokens[0] === "save" && tokens[1] === "as" && tokens[2] === "minion") {
    result.saveTarget = "minion";
    const rest = tokens.slice(3).join(" ");
    const nameMatch = rest.match(/^["'](.+?)["']/);
    if (nameMatch) {
      result.name = nameMatch[1];
    } else if (rest) {
      result.name = rest;
    }
  }

  return result;
}
