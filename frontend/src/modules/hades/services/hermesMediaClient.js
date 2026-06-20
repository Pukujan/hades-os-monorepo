const HADES_API_BASE = "/api/hades/hermes";

export async function startHermesSession(accessToken) {
  const res = await fetch(`${HADES_API_BASE}/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`session start failed: ${res.status} ${body}`);
  }
  return res.json();
}

export async function sendHermesResponse({ hermesApiBaseUrl, input, conversation, previousResponseId }, accessToken) {
  const body = {
    input: typeof input === "string" ? input : input,
    ...(previousResponseId ? { previous_response_id: previousResponseId } : {}),
    ...(conversation ? { conversation } : {}),
  };
  const url = hermesApiBaseUrl.endsWith("/v1") ? `${hermesApiBaseUrl}/responses` : hermesApiBaseUrl;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const bodyText = await res.text();
    throw new Error(`hermes response failed: ${res.status} ${bodyText}`);
  }
  return res.json();
}

export async function uploadHermesMedia({ profileName, file }, accessToken) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${HADES_API_BASE}/${profileName}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`media upload failed: ${res.status} ${body}`);
  }
  return res.json();
}

export async function transcribeHermesAudio({ audioBlob, filename = "recording.wav" }, accessToken) {
  const reader = new FileReader();
  const base64 = await new Promise((resolve, reject) => {
    reader.onload = () => {
      const result = reader.result;
      const base64String = result.split(",")[1] || result;
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });
  const res = await fetch(`${HADES_API_BASE}/transcribe`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ audio: base64, filename }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`transcription failed: ${res.status} ${body}`);
  }
  return res.json();
}

export async function synthesizeHermesSpeech({ text, voice = "en-US-JennyNeural" }, accessToken) {
  const res = await fetch(`${HADES_API_BASE}/speak`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, voice }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`speech synthesis failed: ${res.status} ${body}`);
  }
  return res.blob();
}

export async function buildHermesInputFromComposer({ text, attachments = [] }) {
  const parts = [];
  if (text) {
    parts.push({ type: "text", text });
  }
  for (const att of attachments) {
    if (att.kind === "image" && att.dataUrl) {
      parts.push({ type: "input_image", image_url: att.dataUrl });
    } else if (att.kind === "image" && att.url) {
      parts.push({ type: "input_image", image_url: att.url });
    } else if (att.kind === "document" || att.kind === "video") {
      const note = att.promptPart || `User attached ${att.name} (${att.kind})`;
      parts.push({ type: "text", text: note });
    }
  }
  if (parts.length === 0) {
    parts.push({ type: "text", text: "" });
  }
  return parts.length === 1 ? parts[0].text : parts;
}
