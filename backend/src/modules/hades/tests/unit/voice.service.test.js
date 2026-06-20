import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("createVoiceService", () => {
  describe("synthesizeSpeech", () => {
    test("calls edge-tts with text and default voice", async () => {
      const { createVoiceService } = await import("../../services/voice.service.js");
      const calls = [];
      const service = createVoiceService({
        exec: async (bin, args) => {
          calls.push({ bin, args });
          return { stdout: "" };
        },
        fs_: {
          mkdtempSync: () => "/tmp/test-voice",
          readFileSync: () => Buffer.from("fake-mp3-data"),
          rmSync: () => {},
        },
      });
      const result = await service.synthesizeSpeech({ text: "Hello world" });
      assert.equal(calls.length, 1);
      assert.equal(calls[0].bin, "edge-tts");
      assert.ok(calls[0].args.includes("--text"));
      assert.ok(calls[0].args.includes("Hello world"));
      assert.ok(calls[0].args.includes("--voice"));
      assert.ok(calls[0].args.includes("en-US-JennyNeural"));
      assert.ok(result instanceof Buffer);
    });

    test("uses provided voice option", async () => {
      const { createVoiceService } = await import("../../services/voice.service.js");
      const calls = [];
      const service = createVoiceService({
        exec: async (bin, args) => {
          calls.push({ bin, args });
          return { stdout: "" };
        },
        fs_: {
          mkdtempSync: () => "/tmp/test-voice",
          readFileSync: () => Buffer.from("fake-mp3-data"),
          rmSync: () => {},
        },
      });
      await service.synthesizeSpeech({ text: "Hi", voice: "en-GB-SoniaNeural" });
      assert.ok(calls[0].args.includes("en-GB-SoniaNeural"));
    });

    test("returns audio buffer from written file", async () => {
      const { createVoiceService } = await import("../../services/voice.service.js");
      const audioData = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      const service = createVoiceService({
        exec: async () => ({ stdout: "" }),
        fs_: {
          mkdtempSync: () => "/tmp/test-voice-2",
          readFileSync: () => audioData,
          rmSync: () => {},
        },
      });
      const result = await service.synthesizeSpeech({ text: "Test" });
      assert.ok(Buffer.isBuffer(result));
      assert.equal(result.length, 4);
      assert.deepEqual(result, audioData);
    });

    test("throws if edge-tts command fails", async () => {
      const { createVoiceService } = await import("../../services/voice.service.js");
      const service = createVoiceService({
        exec: async () => { throw new Error("command not found"); },
        fs_: {
          mkdtempSync: () => "/tmp/test-voice",
          readFileSync: () => Buffer.from(""),
          rmSync: () => {},
        },
      });
      await assert.rejects(
        () => service.synthesizeSpeech({ text: "test" }),
        /command not found/
      );
    });
  });

  describe("transcribeAudio", () => {
    test("calls Groq Whisper API with audio data and auth header", async () => {
      const { createVoiceService } = await import("../../services/voice.service.js");
      const fetchCalls = [];
      const service = createVoiceService({
        exec: async () => ({ stdout: "" }),
        fetch: async (url, opts) => {
          fetchCalls.push({ url, opts });
          return {
            ok: true,
            json: async () => ({ text: "Hello world" }),
          };
        },
        env: { GROQ_API_KEY: "test-key-123" },
      });
      const result = await service.transcribeAudio("test.wav", Buffer.from("fake-audio-data"));
      assert.equal(result, "Hello world");
      assert.equal(fetchCalls.length, 1);
      assert.ok(fetchCalls[0].url.includes("api.groq.com"));
      assert.ok(fetchCalls[0].url.includes("audio/transcriptions"));
      assert.equal(fetchCalls[0].opts.headers.Authorization, "Bearer test-key-123");
    });

    test("throws if GROQ_API_KEY is missing", async () => {
      const { createVoiceService } = await import("../../services/voice.service.js");
      const service = createVoiceService({
        exec: async () => ({ stdout: "" }),
        fetch: async () => ({ ok: true, json: async () => ({ text: "" }) }),
        env: {},
      });
      await assert.rejects(
        () => service.transcribeAudio("test.wav", Buffer.from("data")),
        /GROQ_API_KEY/
      );
    });

    test("throws on API error response", async () => {
      const { createVoiceService } = await import("../../services/voice.service.js");
      const service = createVoiceService({
        exec: async () => ({ stdout: "" }),
        fetch: async () => ({
          ok: false,
          status: 401,
          text: async () => "Unauthorized",
        }),
        env: { GROQ_API_KEY: "bad-key" },
      });
      await assert.rejects(
        () => service.transcribeAudio("test.wav", Buffer.from("data")),
        /Groq Whisper API error 401/
      );
    });
  });
});
