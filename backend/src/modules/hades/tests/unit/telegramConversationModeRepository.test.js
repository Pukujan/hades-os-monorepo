import { test, describe } from "node:test";
import assert from "node:assert/strict";

async function loadRepo() {
  try {
    return await import("../../repositories/telegramConversationModeRepository.js");
  } catch (error) {
    throw new Error(
      [
        "Missing conversation mode repository.",
        "Implement backend/src/modules/hades/repositories/telegramConversationModeRepository.js",
        "and export { createTelegramConversationModeRepository }.",
      ].join(" "),
      { cause: error }
    );
  }
}

describe("Telegram conversation mode repository", () => {
  test("getMode defaults to general when no mode has been set", async () => {
    const { createTelegramConversationModeRepository } = await loadRepo();
    const repo = createTelegramConversationModeRepository();
    const mode = await repo.getMode({ chatId: "chat_1", userId: "user_1", tenantId: "tenant_1" });
    assert.equal(mode, "general");
  });

  test("setMode then getMode returns the set value", async () => {
    const { createTelegramConversationModeRepository } = await loadRepo();
    const repo = createTelegramConversationModeRepository();

    await repo.setMode({ chatId: "chat_1", userId: "user_1", tenantId: "tenant_1", mode: "forge" });
    const mode = await repo.getMode({ chatId: "chat_1", userId: "user_1", tenantId: "tenant_1" });
    assert.equal(mode, "forge");
  });

  test("modes are scoped per chatId+userId+tenantId", async () => {
    const { createTelegramConversationModeRepository } = await loadRepo();
    const repo = createTelegramConversationModeRepository();

    await repo.setMode({ chatId: "chat_1", userId: "user_1", tenantId: "tenant_1", mode: "forge" });
    await repo.setMode({ chatId: "chat_2", userId: "user_1", tenantId: "tenant_1", mode: "forge" });
    await repo.setMode({ chatId: "chat_1", userId: "user_2", tenantId: "tenant_2", mode: "forge" });

    const diffUser = await repo.getMode({ chatId: "chat_1", userId: "user_2", tenantId: "tenant_2" });
    assert.equal(diffUser, "forge", "Different user in same chat should have own mode");

    const differentChat = await repo.getMode({ chatId: "chat_3", userId: "user_1", tenantId: "tenant_1" });
    assert.equal(differentChat, "general", "Different chat should default to general");
  });

  test("handles full round trip: general -> forge -> general", async () => {
    const { createTelegramConversationModeRepository } = await loadRepo();
    const repo = createTelegramConversationModeRepository();

    assert.equal(await repo.getMode({ chatId: "chat_1", userId: "user_1", tenantId: "tenant_1" }), "general");

    await repo.setMode({ chatId: "chat_1", userId: "user_1", tenantId: "tenant_1", mode: "forge" });
    assert.equal(await repo.getMode({ chatId: "chat_1", userId: "user_1", tenantId: "tenant_1" }), "forge");

    await repo.setMode({ chatId: "chat_1", userId: "user_1", tenantId: "tenant_1", mode: "general" });
    assert.equal(await repo.getMode({ chatId: "chat_1", userId: "user_1", tenantId: "tenant_1" }), "general");
  });
});
