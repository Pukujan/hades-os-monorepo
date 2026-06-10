export function createPrivateAiClient({ baseUrl, apiKey, fetchImpl = fetch } = {}) {
  async function generateDraft(payload) {
    if (!baseUrl || !apiKey) {
      throw new Error("Private AI client is not configured");
    }

    const response = await fetchImpl(`${baseUrl.replace(/\/$/, "")}/api/hades/minion-draft`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const raw = await response.text();
    const body = raw ? JSON.parse(raw) : null;

    if (!response.ok) {
      const error = new Error(body?.error || body?.message || `Private AI request failed (${response.status})`);
      error.status = response.status;
      throw error;
    }

    return body;
  }

  return { generateDraft };
}

