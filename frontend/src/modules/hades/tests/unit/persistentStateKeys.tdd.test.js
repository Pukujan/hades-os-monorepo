import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_PATH = path.resolve(DIR, "../../pages/HadesPrototypeApp.jsx");

describe("Hades frontend persistent state keys", () => {
  test("user-scoped keys isolate social and chat state across accounts", async () => {
    const { createHadesStorageKey } = await import("../../utils/persistentStateKeys.js");

    const userAKey = createHadesStorageKey("hades.telegramConnection", { userId: "user-a" });
    const userBKey = createHadesStorageKey("hades.telegramConnection", { userId: "user-b" });

    assert.notEqual(userAKey, userBKey);
    assert.equal(userAKey, "hades.user.user-a.telegramConnection");
    assert.equal(userBKey, "hades.user.user-b.telegramConnection");
    assert.equal(
      createHadesStorageKey("hades.chatMessages", { userId: "user-a" }),
      "hades.user.user-a.chatMessages",
    );
  });

  test("global preferences can intentionally remain unscoped", async () => {
    const { createHadesStorageKey } = await import("../../utils/persistentStateKeys.js");

    assert.equal(
      createHadesStorageKey("hades.theme", { userId: "user-a", scope: "global" }),
      "hades.theme",
    );
  });

  test("HadesProvider uses account-scoped keys for social connection state", () => {
    const source = readFileSync(APP_PATH, "utf8");

    assert.ok(source.includes("createHadesStorageKey"), "HadesProvider must derive storage keys through createHadesStorageKey.");
    assert.doesNotMatch(source, /usePersistentState\("hades\.telegramConnection"/);
    assert.doesNotMatch(source, /usePersistentState\("hades\.chatMessages"/);
  });
});
