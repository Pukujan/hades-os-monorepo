const DISCORD_API_BASE = "https://discord.com/api/v10";

export async function createDiscordClient({ botToken, rest } = {}) {
  if (!botToken) {
    throw new Error("Discord bot token is not configured or invalid");
  }

  const httpClient = rest || {
    async post(url, body) {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        throw new Error(`Discord API error: ${response.status}`);
      }
      return response.json();
    },
  };

  async function sendMessage({ channelId, content, gifUrl, replyToMessageId } = {}) {
    const body = { content };

    if (gifUrl) {
      body.embeds = [{ image: { url: gifUrl } }];
    }

    if (replyToMessageId) {
      body.message_reference = { message_id: replyToMessageId };
    }

    const result = await httpClient.post(
      `${DISCORD_API_BASE}/channels/${channelId}/messages`,
      body,
    );

    return { providerMessageId: result.id };
  }

  return { sendMessage };
}
