import { test, describe } from "node:test";
import assert from "node:assert/strict";

async function loadService() {
  try {
    return await import("../../services/hades.service.js");
  } catch (error) {
    throw new Error(
      [
        "Missing hades service.",
        "Implement backend/src/modules/hades/services/hades.service.js",
        "and export { createHadesService }.",
      ].join(" "),
      { cause: error }
    );
  }
}

function makeTelegramUpdate(overrides = {}) {
  return {
    update_id: overrides.updateId ?? 42,
    message: {
      message_id: overrides.messageId ?? 100,
      date: Math.floor(Date.now() / 1000),
      chat: { id: overrides.chatId ?? "chat_1", type: "private" },
      from: { id: overrides.fromId ?? 12345, is_bot: false, first_name: "Test" },
      text: overrides.text ?? "!hades hello",
    },
  };
}

describe("Telegram webhook update_id deduplication", () => {
  test("returns duplicate_ignored for repeated update_id", async () => {
    const { createHadesService } = await loadService();

    let hermesCallCount = 0;
    const service = createHadesService({
      hermesRuntime: {
        generateCommandResult: async () => {
          hermesCallCount++;
          return {
            assistantText: "Hello!",
            commandSpec: {},
            outboundActions: [{ type: "send_message", content: "Hello!" }],
            missingFields: [],
            safety: { allowed: true },
          };
        },
      },
      scopedRepos: {
        telegramConnections: {
          findPublicByUser: async () => ({
            id: "conn_1",
            telegram_user_id: "12345",
            status: "connected",
          }),
          findRuntimeTokenByTelegramUserId: async () => ({
            botToken: "fake:test-token",
          }),
        },
      },
      telegramClientFactory: async () => ({
        sendMessage: async () => ({ providerMessageId: 200 }),
        getMe: async () => ({ id: 12345, username: "TestBot", first_name: "Test" }),
      }),
    });

    const update = makeTelegramUpdate({ updateId: 99 });

    const first = await service.handleTelegramWebhook({
      update,
      userId: "user_1",
      tenantId: "tenant_1",
    });

    assert.equal(first.status, "sent", "First call should process the update");

    const second = await service.handleTelegramWebhook({
      update,
      userId: "user_1",
      tenantId: "tenant_1",
    });

    assert.equal(second.status, "duplicate_ignored", "Second call with same update_id should be ignored");
    assert.equal(
      second.reason,
      "update_id_already_processed",
      "Should include reason for ignoring"
    );

    assert.equal(hermesCallCount, 1, "Hermes should only be called once");
  });

  test("deduplicates across separate service instances via shared processedUpdates repo", async () => {
    const { createHadesService } = await loadService();

    const sharedDedupStore = {
      marked: new Map(),
      async has({ updateId, userId, tenantId }) {
        const key = `${updateId}:${userId}:${tenantId}`;
        return sharedDedupStore.marked.has(key);
      },
      async mark({ updateId, userId, tenantId }) {
        const key = `${updateId}:${userId}:${tenantId}`;
        sharedDedupStore.marked.set(key, Date.now());
      },
    };

    function makeInstance() {
      let hermesCallCount = 0;
      const service = createHadesService({
        hermesRuntime: {
          generateCommandResult: async () => {
            hermesCallCount++;
            return {
              assistantText: "Hello!",
              commandSpec: {},
              outboundActions: [{ type: "send_message", content: "Hello!" }],
              missingFields: [],
              safety: { allowed: true },
            };
          },
        },
        scopedRepos: {
          processedUpdates: sharedDedupStore,
          telegramConnections: {
            findPublicByUser: async () => ({
              id: "conn_1",
              telegram_user_id: "12345",
              status: "connected",
            }),
            findRuntimeTokenByTelegramUserId: async () => ({
              botToken: "fake:test-token",
            }),
          },
        },
        telegramClientFactory: async () => ({
          sendMessage: async () => ({ providerMessageId: 200 }),
          getMe: async () => ({ id: 12345, username: "TestBot", first_name: "Test" }),
        }),
      });
      return { service, getCount: () => hermesCallCount };
    }

    const instanceA = makeInstance();
    const instanceB = makeInstance();

    const update = makeTelegramUpdate({ updateId: 42 });

    const first = await instanceA.service.handleTelegramWebhook({
      update,
      userId: "user_1",
      tenantId: "tenant_1",
    });
    assert.equal(first.status, "sent", "First instance should process the update");
    assert.equal(instanceA.getCount(), 1, "Instance A hermes should be called once");

    const second = await instanceB.service.handleTelegramWebhook({
      update,
      userId: "user_1",
      tenantId: "tenant_1",
    });
    assert.equal(second.status, "duplicate_ignored", "Second instance should see update as already processed");
    assert.equal(
      second.reason,
      "update_id_already_processed",
      "Should include reason for ignoring"
    );
    assert.equal(instanceB.getCount(), 0, "Instance B hermes should NOT be called");
  });

  test("allows different update_ids through", async () => {
    const { createHadesService } = await loadService();

    const service = createHadesService({
      hermesRuntime: {
        generateCommandResult: async () => ({
          assistantText: "Hello!",
          commandSpec: {},
          outboundActions: [{ type: "send_message", content: "Hello!" }],
          missingFields: [],
          safety: { allowed: true },
        }),
      },
      scopedRepos: {
        telegramConnections: {
          findPublicByUser: async () => ({
            id: "conn_1",
            telegram_user_id: "12345",
            status: "connected",
          }),
          findRuntimeTokenByTelegramUserId: async () => ({
            botToken: "fake:test-token",
          }),
        },
      },
      telegramClientFactory: async () => ({
        sendMessage: async () => ({ providerMessageId: 200 }),
        getMe: async () => ({ id: 12345, username: "TestBot", first_name: "Test" }),
      }),
    });

    const update1 = makeTelegramUpdate({ updateId: 1 });
    const update2 = makeTelegramUpdate({ updateId: 2 });

    const first = await service.handleTelegramWebhook({
      update: update1,
      userId: "user_1",
      tenantId: "tenant_1",
    });
    assert.equal(first.status, "sent", "First unique update_id should process");

    const second = await service.handleTelegramWebhook({
      update: update2,
      userId: "user_1",
      tenantId: "tenant_1",
    });
    assert.equal(second.status, "sent", "Different update_id should also process");
  });

  test("refreshes scoped minions before building Telegram runtime context", async () => {
    const { createHadesService } = await loadService();

    let refreshCalls = 0;
    const service = createHadesService({
      hermesRuntime: {
        generateCommandResult: async () => ({
          assistantText: "Hello!",
          commandSpec: {},
          outboundActions: [{ type: "send_message", content: "Hello!" }],
          missingFields: [],
          safety: { allowed: true },
        }),
      },
      scopedRepos: {
        telegramConnections: {
          findPublicByUser: async () => ({
            id: "conn_1",
            telegram_user_id: "12345",
            status: "connected",
          }),
          findRuntimeTokenByTelegramUserId: async () => ({
            botToken: "fake:test-token",
          }),
        },
        minions: {
          refresh: async () => {
            refreshCalls += 1;
          },
          listByUser: async () => [],
        },
      },
      telegramClientFactory: async () => ({
        sendMessage: async () => ({ providerMessageId: 200 }),
        getMe: async () => ({ id: 12345, username: "TestBot", first_name: "Test" }),
      }),
    });

    const result = await service.handleTelegramWebhook({
      update: makeTelegramUpdate({ updateId: 777 }),
      userId: "user_1",
      tenantId: "tenant_1",
    });

    assert.equal(result.status, "sent");
    assert.equal(refreshCalls, 1);
  });
});
