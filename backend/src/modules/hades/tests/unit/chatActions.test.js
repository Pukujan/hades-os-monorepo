import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeChatActions } from "../../services/chatActions.js";

test("allows valid internal route actions", () => {
  const result = normalizeChatActions([
    { type: "route", label: "Open Forge", to: "/app/forge" },
  ]);

  assert.deepEqual(result, [
    { type: "route", label: "Open Forge", to: "/app/forge" },
  ]);
});

test("normalizes route aliases", () => {
  const result = normalizeChatActions([
    { type: "route", label: "Open Forge", to: "/forge" },
  ]);

  assert.deepEqual(result, [
    { type: "route", label: "Open Forge", to: "/app/forge" },
  ]);
});

test("allows safe https external links", () => {
  const result = normalizeChatActions([
    {
      type: "external_link",
      label: "Read about Thor",
      url: "https://en.wikipedia.org/wiki/Thor",
    },
  ]);

  assert.deepEqual(result, [
    {
      type: "external_link",
      label: "Read about Thor",
      url: "https://en.wikipedia.org/wiki/Thor",
    },
  ]);
});

test("drops unsafe external links", () => {
  const result = normalizeChatActions([
    {
      type: "external_link",
      label: "Bad",
      url: "javascript:alert(1)",
    },
    {
      type: "external_link",
      label: "Bad 2",
      url: "http://example.com",
    },
  ]);

  assert.deepEqual(result, []);
});

test("allows allowlisted commands", () => {
  const result = normalizeChatActions([
    {
      type: "command",
      label: "Test Telegram",
      command: "test_integration",
      payload: { integration: "telegram" },
    },
  ]);

  assert.deepEqual(result, [
    {
      type: "command",
      label: "Test Telegram",
      command: "test_integration",
      payload: { integration: "telegram" },
    },
  ]);
});

test("drops unknown commands", () => {
  const result = normalizeChatActions([
    {
      type: "command",
      label: "Delete Everything",
      command: "delete_everything",
    },
  ]);

  assert.deepEqual(result, []);
});

test("limits to three actions", () => {
  const result = normalizeChatActions([
    { type: "route", label: "One", to: "/app/minions" },
    { type: "route", label: "Two", to: "/app/forge" },
    { type: "route", label: "Three", to: "/app/socials" },
    { type: "route", label: "Four", to: "/app/settings" },
  ]);

  assert.equal(result.length, 3);
});
