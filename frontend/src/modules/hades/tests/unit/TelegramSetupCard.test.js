import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import React from "react";
import { buildBotFatherCommand, buildBotFatherPrivacyInstructions, formatTokenDisplay } from "../../services/telegramSetup.js";
import { TelegramSetupCard } from "../../components/TelegramSetupCard.jsx";

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

describe("buildBotFatherPrivacyInstructions", () => {
  test("includes /setprivacy step", () => {
    const instructions = buildBotFatherPrivacyInstructions("my_bot");
    assert.ok(instructions.includes("/setprivacy"));
  });

  test("includes Disable step", () => {
    const instructions = buildBotFatherPrivacyInstructions("my_bot");
    assert.ok(instructions.includes("Disable"));
  });

  test("includes bot username when provided", () => {
    const instructions = buildBotFatherPrivacyInstructions("my_bot");
    assert.ok(instructions.includes("my_bot"));
  });

  test("handles null username gracefully", () => {
    const instructions = buildBotFatherPrivacyInstructions(null);
    assert.ok(instructions.includes("/setprivacy"));
    assert.ok(instructions.includes("Disable"));
  });

  test("handles undefined username gracefully", () => {
    const instructions = buildBotFatherPrivacyInstructions(undefined);
    assert.ok(instructions.includes("/setprivacy"));
    assert.ok(instructions.includes("Disable"));
  });

  test("handles empty string username gracefully", () => {
    const instructions = buildBotFatherPrivacyInstructions("");
    assert.ok(instructions.includes("/setprivacy"));
    assert.ok(instructions.includes("Disable"));
  });
});

describe("TelegramSetupCard rendering", () => {
  test("renders connect interface when disconnected", () => {
    const html = renderToString(
      React.createElement(TelegramSetupCard, {
        connection: { status: "disconnected" },
        currentUser: { username: "alice" },
        onSaveToken: async () => ({})
      })
    );
    assert.ok(html.includes('data-testid="telegram-card"'));
    assert.ok(html.includes("Telegram"));
    assert.ok(html.includes("Not connected"));
  });

  test("renders connected state with bot info", () => {
    const html = renderToString(
      React.createElement(TelegramSetupCard, {
        connection: {
          status: "connected",
          botUsername: "alice_bot",
          tokenLast4: "abcd"
        },
        currentUser: { username: "alice" },
        onSaveToken: async () => ({})
      })
    );
    assert.ok(html.includes('data-testid="telegram-card"'));
    assert.ok(html.includes("@alice_bot"));
  });

  test("renders token input in disconnected state", () => {
    const html = renderToString(
      React.createElement(TelegramSetupCard, {
        connection: { status: "disconnected" },
        currentUser: { username: "alice" },
        onSaveToken: async () => ({})
      })
    );
    assert.ok(html.includes('aria-label="BotFather token"'));
    assert.ok(html.includes('data-testid="telegram-token-row"'));
  });

  test("connected state has no token input", () => {
    const html = renderToString(
      React.createElement(TelegramSetupCard, {
        connection: { status: "connected" },
        currentUser: { username: "alice" },
        onSaveToken: async () => ({})
      })
    );
    assert.ok(!html.includes('aria-label="BotFather token"'));
  });

  test("connected state shows group chat config section", () => {
    const html = renderToString(
      React.createElement(TelegramSetupCard, {
        connection: {
          status: "connected",
          botUsername: "alice_bot",
          tokenLast4: "abcd"
        },
        currentUser: { username: "alice" },
        onSaveToken: async () => ({})
      })
    );
    assert.ok(html.includes("Configure group chat access"));
  });

  test("connected state does not show the disconnected help button", () => {
    const html = renderToString(
      React.createElement(TelegramSetupCard, {
        connection: {
          status: "connected",
          botUsername: "alice_bot",
          tokenLast4: "abcd"
        },
        currentUser: { username: "alice" },
        onSaveToken: async () => ({})
      })
    );
    assert.ok(!html.includes("Copy setup command &amp; open BotFather"));
  });

  test("disconnected state does not show group chat config section", () => {
    const html = renderToString(
      React.createElement(TelegramSetupCard, {
        connection: { status: "disconnected" },
        currentUser: { username: "alice" },
        onSaveToken: async () => ({})
      })
    );
    assert.ok(!html.includes("Configure group chat access"));
  });

  test("connected state shows privacy mode instructions", () => {
    const html = renderToString(
      React.createElement(TelegramSetupCard, {
        connection: {
          status: "connected",
          botUsername: "alice_bot",
          tokenLast4: "abcd"
        },
        currentUser: { username: "alice" },
        onSaveToken: async () => ({})
      })
    );
    assert.ok(html.includes("/setprivacy"));
    assert.ok(html.includes("Disable"));
  });
});
