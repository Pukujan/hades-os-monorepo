export function buildBotFatherCommand(username) {
  const botSuffix = username ? `hades_${username}_minion_bot` : "hades_minion_bot";
  return ["/newbot", "Hades Minion", botSuffix].join("\n");
}

export function formatTokenDisplay(last4) {
  if (!last4) return "";
  return `\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022${last4}`;
}
