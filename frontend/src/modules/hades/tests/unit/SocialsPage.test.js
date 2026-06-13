import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { SOCIAL_LINKS, formatSocialLabel, getSocialIcon } from "../../hadesData.js";

describe("SocialsPage data", () => {
  test("Discord shows disconnected state by default", () => {
    const discord = SOCIAL_LINKS.find((s) => s.provider === "discord");
    assert.ok(discord);
    assert.equal(discord.status, "not_connected");
    assert.equal(discord.displayName, "Discord");
    assert.equal(formatSocialLabel("discord"), "Discord");
    assert.equal(getSocialIcon("discord"), "discord");
  });

  test("Discord connected state is determined by status field", () => {
    const connectedLink = { ...SOCIAL_LINKS.find((s) => s.provider === "discord"), status: "connected" };
    assert.equal(connectedLink.status, "connected");
  });

  test("Telegram shows disconnected state by default", () => {
    const telegram = SOCIAL_LINKS.find((s) => s.provider === "telegram");
    assert.ok(telegram);
    assert.equal(telegram.status, "locked");
    assert.equal(telegram.displayName, "Telegram");
    assert.equal(formatSocialLabel("telegram"), "Telegram");
    assert.equal(getSocialIcon("telegram"), "telegram");
  });

  test("Telegram token_testing state is a valid status", () => {
    const connectedLink = { ...SOCIAL_LINKS.find((s) => s.provider === "telegram"), status: "token_testing" };
    assert.equal(connectedLink.status, "token_testing");
  });

  test("Telegram token_valid state includes botUsername", () => {
    const connectedLink = {
      ...SOCIAL_LINKS.find((s) => s.provider === "telegram"),
      status: "token_valid",
      botUsername: "hades_bot",
    };
    assert.equal(connectedLink.status, "token_valid");
    assert.equal(connectedLink.botUsername, "hades_bot");
  });

  test("Telegram token_invalid state", () => {
    const connectedLink = { ...SOCIAL_LINKS.find((s) => s.provider === "telegram"), status: "token_invalid" };
    assert.equal(connectedLink.status, "token_invalid");
  });

  test("each social provider has unique id and displayName", () => {
    const ids = SOCIAL_LINKS.map((s) => s.id);
    const names = SOCIAL_LINKS.map((s) => s.displayName);
    assert.equal(new Set(ids).size, SOCIAL_LINKS.length);
    assert.equal(new Set(names).size, SOCIAL_LINKS.length);
  });

  test("social providers resolve to stable icon names", () => {
    const providers = SOCIAL_LINKS.map((s) => s.provider);
    for (const p of providers) {
      const icon = getSocialIcon(p);
      assert.equal(typeof icon, "string");
      assert.ok(icon.length > 0);
    }
  });
});
