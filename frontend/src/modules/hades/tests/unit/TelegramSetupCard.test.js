import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildBotFatherCommand, formatTokenDisplay } from "../../telegramSetup.js";

describe("buildBotFatherCommand", () => {
  test("includes username in bot suffix when provided", () => {
    const command = buildBotFatherCommand("alice");
    assert.equal(command, "/newbot\nHades Minion\nhades_alice_minion_bot");
  });

  test("uses default bot suffix when username is missing", () => {
    const command = buildBotFatherCommand(null);
    assert.equal(command, "/newbot\nHades Minion\nhades_minion_bot");
  });

  test("uses default bot suffix when username is undefined", () => {
    const command = buildBotFatherCommand(undefined);
    assert.equal(command, "/newbot\nHades Minion\nhades_minion_bot");
  });

  test("uses default bot suffix when username is empty string", () => {
    const command = buildBotFatherCommand("");
    assert.equal(command, "/newbot\nHades Minion\nhades_minion_bot");
  });

  test("returns three-line command", () => {
    const lines = buildBotFatherCommand("bob").split("\n");
    assert.equal(lines.length, 3);
    assert.equal(lines[0], "/newbot");
    assert.equal(lines[1], "Hades Minion");
    assert.ok(lines[2].startsWith("hades_"));
    assert.ok(lines[2].endsWith("_bot"));
  });
});

describe("formatTokenDisplay", () => {
  test("returns masked string with last 4 characters", () => {
    assert.equal(formatTokenDisplay("1234"), "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u20221234");
  });

  test("returns empty string when last4 is null", () => {
    assert.equal(formatTokenDisplay(null), "");
  });

  test("returns empty string when last4 is undefined", () => {
    assert.equal(formatTokenDisplay(undefined), "");
  });

  test("returns empty string when last4 is empty", () => {
    assert.equal(formatTokenDisplay(""), "");
  });
});
