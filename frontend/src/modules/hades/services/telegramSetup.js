export function buildBotFatherCommand(username) {
  const botSuffix = username ? `hades_${username}_minion_bot` : "hades_minion_bot";
  return ["/newbot", "Hades Minion", botSuffix].join("\n");
}

export function buildBotFatherPrivacyInstructions(botUsername) {
  const botRef = botUsername ? `@${botUsername}` : "your bot";
  return [
    `To enable !hades in group chats for ${botRef}:`,
    "",
    "1. Open BotFather (you'll be redirected there)",
    "2. Send: /setprivacy",
    `3. Select ${botRef} from the list`,
    "4. Tap: Disable",
    "",
    "After that, add the bot to a group and send: !hades <your request>",
  ].join("\n");
}

export function formatTokenDisplay(last4) {
  if (!last4) return "";
  return `\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022${last4}`;
}
