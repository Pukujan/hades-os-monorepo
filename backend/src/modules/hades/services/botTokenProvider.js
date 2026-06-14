export function createBotTokenProvider({ findSocialConnection } = {}) {
  if (typeof findSocialConnection !== "function") {
    throw new Error("findSocialConnection is not configured");
  }

  async function getBotToken({ userId, provider } = {}) {
    const connection = await findSocialConnection({ userId, provider });
    if (!connection || !connection.botToken) {
      return null;
    }
    return connection.botToken;
  }

  return { getBotToken };
}
