export function buildDiscordInviteUrl(clientId = "your-client-id", permissions = "0") {
  return `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=bot`;
}

export function formatDiscordBotName(name) {
  if (!name) return "Discord Bot";
  return name;
}
