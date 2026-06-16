import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeMinion } from "../../utils/hadesData.js";

test("normalizeMinion returns null for null/undefined input", () => {
  assert.equal(normalizeMinion(null), null);
  assert.equal(normalizeMinion(undefined), null);
});

test("normalizeMinion normalizes MOCK_MINIONS shape", () => {
  const mock = {
    id: "cat",
    name: "Cat Courier",
    emoji: "\uD83D\uDC31",
    description: "Speak the word after the summon",
    type: "manual",
    command: "!sendcat",
    destination: "Discord \u00B7 #cat-chaos",
    destinationProvider: "discord",
    interval: null,
  };
  const n = normalizeMinion(mock);
  assert.equal(n.id, "cat");
  assert.equal(n.name, "Cat Courier");
  assert.equal(n.emoji, "\uD83D\uDC31");
  assert.equal(n.command, "!sendcat");
  assert.equal(n.summon, "!sendcat");
  assert.equal(n.destination, "Discord \u00B7 #cat-chaos");
  assert.equal(n.kind, "manual");
  assert.equal(n.schedule, null);
});

test("normalizeMinion normalizes starter minion shape", () => {
  const starter = {
    id: "cat-courier",
    name: "Cat Courier",
    emoji: "\uD83D\uDC31",
    description: "Manual summon \u00B7 Discord + chat",
    status: "active",
    commandName: "!sendcat",
    targetSocial: "discord",
    destination: { provider: "discord", channelName: "#cat-chaos" },
  };
  const n = normalizeMinion(starter);
  assert.equal(n.id, "cat-courier");
  assert.equal(n.name, "Cat Courier");
  assert.equal(n.emoji, "\uD83D\uDC31");
  assert.equal(n.command, "!sendcat");
  assert.equal(n.summon, "!sendcat");
  assert.equal(n.destination, "#cat-chaos");
});

test("normalizeMinion auto minion has correct kind", () => {
  const mock = { id: "brief", name: "Brief Wraith", type: "auto", description: "It prowls" };
  const n = normalizeMinion(mock);
  assert.equal(n.kind, "auto");
});

test("normalizeMinion uses fallback values for missing fields", () => {
  const n = normalizeMinion({ id: "x" });
  assert.equal(n.name, "Unnamed");
  assert.equal(n.emoji, "");
  assert.equal(n.command, "");
  assert.equal(n.status, "inactive");
});
