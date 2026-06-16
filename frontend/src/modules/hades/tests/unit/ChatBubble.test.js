import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

test("ChatBubble renders message content", async () => {
  const mod = await import("../../components/ChatBubble.js");
  const { ChatBubble } = mod;
  const html = renderToString(
    React.createElement(MemoryRouter, null,
      React.createElement(ChatBubble, {
        message: { role: "hades", content: "Hello world" }
      })
    )
  );
  assert.ok(html.includes("Hello world"));
});

test("ChatBubble renders external_link action as <a> with href and label", async () => {
  const mod = await import("../../components/ChatBubble.js");
  const { ChatBubble } = mod;
  const html = renderToString(
    React.createElement(MemoryRouter, null,
      React.createElement(ChatBubble, {
        message: {
          role: "hades",
          content: "Check this",
          actions: [{ type: "external_link", url: "https://example.com", label: "Open example.com" }]
        }
      })
    )
  );
  assert.ok(html.includes('href="https://example.com"'));
  assert.ok(html.includes("Open example.com"));
  assert.ok(html.includes("hades-action-button"));
});

test("ChatBubble renders command action as <button>", async () => {
  const mod = await import("../../components/ChatBubble.js");
  const { ChatBubble } = mod;
  const html = renderToString(
    React.createElement(MemoryRouter, null,
      React.createElement(ChatBubble, {
        message: {
          role: "hades",
          content: "Run this",
          actions: [{ type: "command", command: "deploy", label: "Deploy now" }]
        }
      })
    )
  );
  assert.ok(html.includes("Deploy now"));
  assert.ok(html.includes("<button"));
});

test("ChatBubble renders route action as <button>", async () => {
  const mod = await import("../../components/ChatBubble.js");
  const { ChatBubble } = mod;
  const html = renderToString(
    React.createElement(MemoryRouter, null,
      React.createElement(ChatBubble, {
        message: {
          role: "hades",
          content: "Navigate",
          actions: [{ type: "route", to: "/minions", label: "View minions" }]
        }
      })
    )
  );
  assert.ok(html.includes("View minions"));
  assert.ok(html.includes("<button"));
});

test("ChatBubble renders no actions div when actions is empty", async () => {
  const mod = await import("../../components/ChatBubble.js");
  const { ChatBubble } = mod;
  const html = renderToString(
    React.createElement(MemoryRouter, null,
      React.createElement(ChatBubble, {
        message: { role: "hades", content: "No actions here" }
      })
    )
  );
  assert.ok(!html.includes("hades-message-actions"));
});

test("ChatBubble renders user bubble with user class", async () => {
  const mod = await import("../../components/ChatBubble.js");
  const { ChatBubble } = mod;
  const html = renderToString(
    React.createElement(MemoryRouter, null,
      React.createElement(ChatBubble, {
        message: { role: "user", content: "Hello" }
      })
    )
  );
  assert.ok(html.includes('class="bubble user'));
});
