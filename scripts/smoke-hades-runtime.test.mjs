import { test } from "node:test";
import assert from "node:assert/strict";
import { runHadesSmoke } from "./smoke-hades-runtime.mjs";

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body)
  };
}

test("Hades smoke script runs the hosted MVP minion flow", async () => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init });
    const path = new URL(url).pathname;

    if (path === "/api/health") return jsonResponse({ status: "ok" });
    if (path === "/api/hades/readiness") {
      return jsonResponse({
        status: "ok",
        mode: "local",
        storage: { mode: "memory", configured: false },
        ai: { provider: "openrouter", model: "deepseek/deepseek-v4-flash", configured: false },
        cors: { origin: null },
        deploy: { backendPlatform: "railway", frontendPlatform: "vercel" }
      });
    }
    if (path === "/api/hades/bootstrap") {
      return jsonResponse({
        userId: "local-user",
        conversationId: "conv-1",
        messages: [],
        draft: { status: "incomplete" },
        minions: [],
        assignments: [],
        socialLinks: [],
        levelState: { level: 1 },
        source: "memory"
      });
    }
    if (path === "/api/hades/chat") {
      return jsonResponse({
        conversationId: "conv-1",
        draft: {
          name: "Cat Meme Minion",
          description: "Sends cat memes.",
          category: "fun",
          targetSocial: "discord",
          triggerType: "command",
          commandName: "!sendcatmeme",
          action: "send a random cat meme GIF",
          responseStyle: "helpful",
          safetyMode: "ask_first",
          testInput: null,
          status: "ready_to_test"
        }
      });
    }
    if (path === "/api/hades/minions/test") {
      return jsonResponse(
        {
          testRun: { id: "testrun-1", status: "passed" },
          draft: {
            name: "Cat Meme Minion",
            description: "Sends cat memes.",
            category: "fun",
            targetSocial: "discord",
            triggerType: "command",
            commandName: "!sendcatmeme",
            action: "send a random cat meme GIF",
            responseStyle: "helpful",
            safetyMode: "ask_first",
            testInput: "!sendcatmeme",
            status: "tested"
          }
        },
        201
      );
    }
    if (path === "/api/hades/minions") {
      return jsonResponse({ minion: { id: "minion-1", name: "Cat Meme Minion", commandName: "!sendcatmeme" } }, 201);
    }
    if (path === "/api/hades/assignments") {
      return jsonResponse({ assignment: { id: "assignment-1", minionId: "minion-1", socialLinkId: "discord" } }, 201);
    }

    return jsonResponse({ error: `Unexpected path: ${path}` }, 404);
  };

  const logs = [];
  const summary = await runHadesSmoke({
    baseUrl: "http://127.0.0.1:3001",
    fetchImpl,
    logger: { log: (line) => logs.push(line), error: (line) => logs.push(line) }
  });

  assert.equal(summary.conversationId, "conv-1");
  assert.equal(summary.minionId, "minion-1");
  assert.equal(summary.assignmentId, "assignment-1");
  assert.equal(summary.readinessMode, "local");
  assert.deepEqual(
    calls.map((call) => new URL(call.url).pathname),
    [
      "/api/health",
      "/api/hades/readiness",
      "/api/hades/bootstrap",
      "/api/hades/chat",
      "/api/hades/minions/test",
      "/api/hades/minions",
      "/api/hades/assignments",
      "/api/hades/bootstrap"
    ]
  );
  assert.equal(JSON.stringify(logs).includes("OPENROUTER_API_KEY"), false);
  assert.equal(JSON.stringify(logs).includes("SUPABASE_SERVICE_ROLE_KEY"), false);
});

test("Hades smoke script stops early when health fails", async () => {
  await assert.rejects(
    () =>
      runHadesSmoke({
        baseUrl: "http://127.0.0.1:3001",
        fetchImpl: async () => jsonResponse({ error: "down" }, 503),
        logger: { log() {}, error() {} }
      }),
    /GET \/api\/health failed/
  );
});

test("Hades smoke script names the failed route", async () => {
  await assert.rejects(
    () =>
      runHadesSmoke({
        baseUrl: "http://127.0.0.1:3001",
        fetchImpl: async (url) => {
          const path = new URL(url).pathname;
          if (path === "/api/hades/chat") return jsonResponse({ error: "bad chat" }, 500);
          return jsonResponse(path === "/api/hades/readiness" ? { status: "ok", mode: "local" } : {});
        },
        logger: { log() {}, error() {} }
      }),
    /POST \/api\/hades\/chat failed/
  );
});
