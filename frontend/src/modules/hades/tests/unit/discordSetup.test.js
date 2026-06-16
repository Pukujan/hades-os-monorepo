import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildDiscordInviteUrl, formatDiscordBotName } from "../../services/discordSetup.js";

describe("buildDiscordInviteUrl", () => {
  test("creates Discord OAuth URL with default permissions", () => {
    const url = buildDiscordInviteUrl();
    assert.ok(url.startsWith("https://discord.com/oauth2/authorize"));
    assert.ok(url.includes("client_id="));
    assert.ok(url.includes("permissions=0"));
    assert.ok(url.includes("scope=bot"));
  });

  test("accepts custom client ID", () => {
    const url = buildDiscordInviteUrl("123456789");
    assert.ok(url.includes("client_id=123456789"));
  });

  test("accepts custom permissions integer", () => {
    const url = buildDiscordInviteUrl("123", "2048");
    assert.ok(url.includes("permissions=2048"));
  });

  test("returns a valid URL string", () => {
    const url = buildDiscordInviteUrl("test-client");
    assert.doesNotThrow(() => new URL(url));
  });
});

describe("formatDiscordBotName", () => {
  test("returns bot name when provided", () => {
    assert.equal(formatDiscordBotName("MyBot"), "MyBot");
  });

  test("returns fallback when name is null", () => {
    assert.equal(formatDiscordBotName(null), "Discord Bot");
  });

  test("returns fallback when name is undefined", () => {
    assert.equal(formatDiscordBotName(undefined), "Discord Bot");
  });

  test("returns fallback when name is empty", () => {
    assert.equal(formatDiscordBotName(""), "Discord Bot");
  });
});
