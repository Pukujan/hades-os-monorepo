import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);

export function createVoiceService({
  exec = execFileAsync,
  fetch = globalThis.fetch,
  env = process.env,
  fs_ = fs,
} = {}) {
  async function synthesizeSpeech({ text, voice = "en-US-JennyNeural" } = {}) {
    if (!text) throw new Error("text is required");
    const tmpDir = fs_.mkdtempSync(path.join(os.tmpdir(), "voice-tts-"));
    const tmpFile = path.join(tmpDir, "output.mp3");
    try {
      await exec("edge-tts", [
        "--text", text,
        "--voice", voice,
        "--write-media", tmpFile,
      ]);
      return fs_.readFileSync(tmpFile);
    } finally {
      try { fs_.rmSync(tmpDir, { recursive: true, force: true }); }
      catch { /* ignore cleanup errors */ }
    }
  }

  async function transcribeAudio(filename, audioBuffer) {
    const apiKey = env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is required for audio transcription");

    const form = new FormData();
    const blob = new Blob([audioBuffer], { type: "audio/wav" });
    form.append("file", blob, filename || "audio.wav");
    form.append("model", "whisper-large-v3");
    form.append("response_format", "json");

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Groq Whisper API error ${res.status}: ${body}`);
    }

    const data = await res.json();
    return data.text;
  }

  return { synthesizeSpeech, transcribeAudio };
}
