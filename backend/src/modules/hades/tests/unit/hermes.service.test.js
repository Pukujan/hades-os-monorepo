import { test } from "node:test";
import assert from "node:assert/strict";
import { createHadesRepository } from "../../repositories/hades.repository.js";
import { createHermesService } from "../../services/hermes.service.js";
import { createHadesService } from "../../services/hades.service.js";
import { createEmptyDraft } from "../../data.js";

test("Hermes runtime response is used and sanitized", async () => {
  let runtimeCalls = 0;
  const hermes = createHermesService({
    hermesRuntime: {
      async generateDraft() {
        runtimeCalls += 1;
        return {
          source: "hermes_runtime",
          sessionId: "20260611_runtime",
          assistantText: "<strong>Done</strong>",
          draftPatch: {
            name: "Task Helper",
            category: "task",
            targetSocial: "private",
            triggerType: "manual",
            action: "turn messy instructions into simple task cards"
          },
          missingFields: [],
          suggestions: ["Test it"]
        };
      }
    }
  });

  const result = await hermes.buildResponse({
    conversationId: "conv-1",
    message: "Make a task helper",
    currentDraft: createEmptyDraft(),
    context: "forge"
  });

  assert.equal(runtimeCalls, 1);
  assert.equal(result.source, "hermes_runtime");
  assert.equal(result.sessionId, "20260611_runtime");
  assert.equal(result.assistantMessage.content, "Done");
  assert.equal(result.draft.name, "Task Helper");
});

test("Hermes runtime invalid enum output fails fast", async () => {
  const hermes = createHermesService({
    hermesRuntime: {
      async generateDraft() {
        return {
          source: "hermes_runtime",
          assistantText: "Invalid draft",
          draftPatch: {
            name: "Unsafe Minion",
            category: "unknown",
            targetSocial: "discord",
            triggerType: "command"
          },
          missingFields: [],
          suggestions: []
        };
      }
    }
  });

  await assert.rejects(
    () =>
      hermes.buildResponse({
        conversationId: "conv-1",
        message: "I want a command to send cat memes in Discord",
        currentDraft: createEmptyDraft(),
        context: "forge"
      }),
    /Invalid draft patch from Hermes runtime/i
  );
});

test("buildResponse forwards minions to generateDraft", async () => {
  let generateDraftInput = null;
  const hermes = createHermesService({
    hermesRuntime: {
      async generateDraft(input) {
        generateDraftInput = input;
        return {
          source: "hermes_runtime",
          sessionId: "sess-1",
          assistantText: "Done",
          draftPatch: { name: "Task Helper", category: "task", targetSocial: "private", triggerType: "manual" },
          missingFields: [],
          suggestions: []
        };
      }
    }
  });

  const minions = [{ id: "m1", name: "TestMinion", instructions: "do stuff" }];
  await hermes.buildResponse({
    conversationId: "conv-1",
    message: "Make a task helper",
    currentDraft: createEmptyDraft(),
    minions,
  });

  assert.equal(generateDraftInput.minions, minions, "should forward minions to generateDraft");
});

test("Hermes runtime failure bubbles instead of falling back", async () => {
  const hermes = createHermesService({
    hermesRuntime: {
      async generateDraft() {
        throw new Error("runtime down");
      }
    }
  });

  await assert.rejects(
    () =>
      hermes.buildResponse({
        message: "I want a command to send cat memes in Discord",
        currentDraft: createEmptyDraft()
      }),
      /runtime down/i
  );
});

test("general chat promotes verified direct GIF URLs from Hermes text into media fields", async () => {
  const tenorUrl = "https://media.tenor.com/9E6S0OziLzEAAAAC/anime-girl-anime.gif";
  const verifiedUrls = [];
  const hermes = createHermesService({
    hermesRuntime: {
      async generateDraft() {
        return {
          source: "hermes_runtime",
          sessionId: "session-media-inline-1",
          assistantText: `Testing, got it. Here's a fresh one:\n\n${tenorUrl}`,
          actions: [],
          cards: [],
        };
      }
    },
    mediaVerifier: {
      async verifyMediaUrl({ url, allowedContentTypes }) {
        verifiedUrls.push({ url, allowedContentTypes });
        return {
          ok: true,
          url,
          contentType: "image/gif",
        };
      }
    }
  });

  const result = await hermes.buildResponse({
    conversationId: "conv-media-1",
    message: "send direct tenor gif",
    currentDraft: createEmptyDraft(),
    context: "general"
  });

  assert.equal(verifiedUrls.length, 1);
  assert.equal(verifiedUrls[0].url, tenorUrl);
  assert.ok(verifiedUrls[0].allowedContentTypes.includes("image/gif"));
  assert.equal(result.assistantMessage.gifUrl, tenorUrl);
  assert.equal(result.assistantMessage.mediaUrl, tenorUrl);
  assert.equal(result.assistantMessage.mediaType, "image/gif");
  assert.equal(result.assistantMessage.mediaVerificationStatus, "verified");
  assert.equal(result.assistantMessage.mediaVerificationReason, null);
});

test("Hades service chat uses backend-authenticated user context when provided", async () => {
  const repository = createHadesRepository({ now: () => "2026-06-12T00:00:00.000Z" });
  const hermes = createHermesService({
    hermesRuntime: {
      async generateDraft(input) {
        assert.equal(input.userId, "user_123");
        return {
          source: "hermes_runtime",
          sessionId: "session-auth-1",
          assistantText: "Updated",
          draftPatch: {
            name: "Task Helper",
            category: "task",
            targetSocial: "private",
            triggerType: "manual",
            action: "turn messy instructions into simple task cards"
          },
          missingFields: [],
          suggestions: []
        };
      }
    }
  });
  const service = createHadesService({ repository, hermes });

  const result = await service.chat(
    {
      clientMessageId: "msg-auth-1",
      idempotencyKey: "idem-auth-1",
      message: "Make a task helper",
      currentDraft: createEmptyDraft()
    },
    {
      userId: "user_123",
      tenantId: "tenant_123",
      discordAccountId: "discord_456",
      provider: "discord"
    }
  );

  assert.equal(result.sessionId, "session-auth-1");
  assert.equal(result.userMessage.userId, "user_123");
  assert.equal(result.assistantMessage.role, "assistant");
  const snapshot = repository.getSnapshot();
  assert.equal(snapshot.conversations[0].userId, "user_123");
  assert.equal(snapshot.agentExecutions[0].userId, "user_123");
});
