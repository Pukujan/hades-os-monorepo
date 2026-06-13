const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

export async function createTelegramClient({ botToken, api } = {}) {
  if (!botToken) {
    throw new Error("Telegram bot token is not configured or invalid");
  }

  const httpClient = api || {
    async post(method, body) {
      const url = `${TELEGRAM_API_BASE}${botToken}/${method}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!result.ok) {
        throw new Error(
          `Telegram API error: ${result.error_code} ${result.description}`
        );
      }
      return result;
    },
  };

  async function sendMessage({ chatId, text, parseMode, replyToMessageId } = {}) {
    const body = { chat_id: chatId, text };
    if (parseMode) body.parse_mode = parseMode;
    if (replyToMessageId != null) body.reply_to_message_id = replyToMessageId;

    const result = await httpClient.post("sendMessage", body);
    if (!result.ok) {
      throw new Error(
        `Telegram API error: ${result.error_code} ${result.description}`
      );
    }
    return { providerMessageId: result.result?.message_id };
  }

  async function setWebhook({ url } = {}) {
    const result = await httpClient.post("setWebhook", { url });
    return result.result === true;
  }

  return { sendMessage, setWebhook };
}
