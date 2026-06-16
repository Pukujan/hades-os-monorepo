import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import React from "react";

import { DiscordSetupCard } from "../../components/DiscordSetupCard.jsx";

describe("DiscordSetupCard rendering", () => {
  test("renders connect interface when disconnected", () => {
    const html = renderToString(
      React.createElement(DiscordSetupCard, {
        connection: { status: "disconnected" },
        onSaveToken: async () => ({})
      })
    );
    assert.ok(html.includes('data-testid="discord-card"'));
    assert.ok(html.includes("Discord"));
    assert.ok(html.includes("Not connected"));
  });

  test("renders connected state with bot info", () => {
    const html = renderToString(
      React.createElement(DiscordSetupCard, {
        connection: {
          status: "connected",
          botUsername: "HadesBot#1234",
          tokenLast4: "abcd"
        },
        onSaveToken: async () => ({})
      })
    );
    assert.ok(html.includes('data-testid="discord-card"'));
    assert.ok(html.includes("HadesBot#1234"));
  });

  test("renders token input in disconnected state", () => {
    const html = renderToString(
      React.createElement(DiscordSetupCard, {
        connection: { status: "disconnected" },
        onSaveToken: async () => ({})
      })
    );
    assert.ok(html.includes('aria-label="Discord bot token"'));
    assert.ok(html.includes('data-testid="discord-actions"'));
  });

  test("connected state has no token input", () => {
    const html = renderToString(
      React.createElement(DiscordSetupCard, {
        connection: { status: "connected" },
        onSaveToken: async () => ({})
      })
    );
    assert.ok(!html.includes('aria-label="Discord bot token"'));
  });

  test("renders help button linking to Discord Developer Portal in disconnected state", () => {
    const html = renderToString(
      React.createElement(DiscordSetupCard, {
        connection: { status: "disconnected" },
        onSaveToken: async () => ({})
      })
    );
    assert.ok(html.includes("Open Discord Developer Portal"));
  });

  test("connected state does not show help button", () => {
    const html = renderToString(
      React.createElement(DiscordSetupCard, {
        connection: { status: "connected" },
        onSaveToken: async () => ({})
      })
    );
    assert.ok(!html.includes("Open Discord Developer Portal"));
  });

  test("connected state has discord-card class on article", () => {
    const html = renderToString(
      React.createElement(DiscordSetupCard, {
        connection: {
          status: "connected",
          botUsername: "HadesBot#1234",
          tokenLast4: "abcd"
        },
        onSaveToken: async () => ({})
      })
    );
    assert.ok(html.includes('class="permission discord-card"'));
  });

  test("connected state shows social-actions with call to action", () => {
    const html = renderToString(
      React.createElement(DiscordSetupCard, {
        connection: {
          status: "connected",
          botUsername: "HadesBot#1234",
          tokenLast4: "abcd"
        },
        onSaveToken: async () => ({})
      })
    );
    assert.ok(html.includes('data-testid="discord-connected-actions"'));
    assert.ok(html.includes("Configure server setup"));
  });
});
