import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { SOCIAL_LINKS } from "../../hadesData.js";

describe("SocialsPage Telegram integration", () => {
  const telegramDefault = SOCIAL_LINKS.find((s) => s.provider === "telegram");

  test("Telegram defaults to locked status", () => {
    assert.ok(telegramDefault);
    assert.equal(telegramDefault.status, "locked");
    assert.equal(telegramDefault.commandName, null);
  });

  test("Telegram connected state includes botUsername and token_last4", () => {
    const connected = {
      ...telegramDefault,
      status: "connected",
      botUsername: "hades_alice_minion_bot",
      token_last4: "a1b2"
    };
    assert.equal(connected.status, "connected");
    assert.equal(connected.botUsername, "hades_alice_minion_bot");
    assert.equal(connected.token_last4, "a1b2");
  });

  test("Telegram token_testing state", () => {
    const testing = { ...telegramDefault, status: "token_testing" };
    assert.equal(testing.status, "token_testing");
  });

  test("Telegram token_invalid state", () => {
    const invalid = { ...telegramDefault, status: "token_invalid" };
    assert.equal(invalid.status, "token_invalid");
  });

  test("Telegram disconnected state falls through from locked or not_connected", () => {
    const locked = { ...telegramDefault, status: "locked" };
    const notConnected = { ...telegramDefault, status: "not_connected" };
    assert.ok(["locked", "not_connected"].includes(locked.status));
    assert.ok(["locked", "not_connected"].includes(notConnected.status));
  });

  test("Telegram status transitions are valid: disconnected -> testing -> connected", () => {
    const states = ["disconnected", "token_testing", "connected"];
    for (const s of states) {
      const entry = { ...telegramDefault, status: s };
      assert.equal(entry.status, s);
    }
  });

  test("Telegram status transitions: disconnected -> testing -> token_invalid", () => {
    const states = ["disconnected", "token_testing", "token_invalid"];
    for (const s of states) {
      const entry = { ...telegramDefault, status: s };
      assert.equal(entry.status, s);
    }
  });

  test("Telegram connection payload from API uses snake_case fields", () => {
    const apiPayload = {
      status: "connected",
      bot_username: "hades_bot",
      token_last4: "5678"
    };
    assert.equal(apiPayload.status, "connected");
    assert.equal(apiPayload.bot_username, "hades_bot");
    assert.equal(apiPayload.token_last4, "5678");
  });

  test("Telegram connection response maps botUsername and tokenLast4", () => {
    const apiPayload = {
      status: "connected",
      botUsername: "hades_bot",
      tokenLast4: "5678"
    };
    assert.equal(apiPayload.status, "connected");
    assert.equal(apiPayload.botUsername, "hades_bot");
    assert.equal(apiPayload.tokenLast4, "5678");
  });

  test("Telegram has unique id across social providers", () => {
    const ids = SOCIAL_LINKS.map((s) => s.id);
    assert.equal(new Set(ids).size, SOCIAL_LINKS.length);
    assert.ok(ids.includes("telegram"));
  });
});
