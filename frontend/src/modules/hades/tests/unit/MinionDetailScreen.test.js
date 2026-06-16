import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";

function makeMinion(overrides = {}) {
  return {
    id: "minion-test-1",
    name: "Cat Courier",
    description: "Sends cat memes",
    type: "manual",
    command: "!sendcat",
    version: "1.0.0",
    source: "forge",
    slotIndex: 0,
    triggerType: "manual",
    targetSocial: "discord",
    status: "active",
    ownerType: "user",
    destination: "discord",
    ...overrides
  };
}

async function renderDetail(minions, initialRoute = "/app/minions/minion-test-1") {
  const { MinionDetailScreen } = await import("../../pages/MinionDetailScreen.jsx");
  return renderToString(
    React.createElement(MemoryRouter, { initialEntries: [initialRoute] },
      React.createElement(Routes, null,
        React.createElement(Route, {
          path: "/app/minions/:id",
          element: React.createElement(MinionDetailScreen, {
            minions,
            onActivate: () => {},
            onDeactivate: () => {}
          })
        })
      )
    )
  );
}

test("MinionDetailScreen renders minion name and description", async () => {
  const minions = [makeMinion()];
  const html = await renderDetail(minions);
  assert.ok(html.includes("Cat Courier"));
  assert.ok(html.includes("Sends cat memes"));
});

test("MinionDetailScreen renders back button", async () => {
  const minions = [makeMinion()];
  const html = await renderDetail(minions);
  assert.ok(html.includes("Back to slots"));
});

test("MinionDetailScreen renders edit minion button", async () => {
  const minions = [makeMinion()];
  const html = await renderDetail(minions);
  assert.ok(html.includes("Edit minion"));
});

test("MinionDetailScreen renders manual summon button for manual minions", async () => {
  const minions = [makeMinion({ type: "manual" })];
  const html = await renderDetail(minions);
  assert.ok(html.includes("Manual summon"));
});

test("MinionDetailScreen renders test run button for manual minions", async () => {
  const minions = [makeMinion({ type: "manual" })];
  const html = await renderDetail(minions);
  assert.ok(html.includes("Test run"));
});

test("MinionDetailScreen renders view logs button", async () => {
  const minions = [makeMinion()];
  const html = await renderDetail(minions);
  assert.ok(html.includes("View logs"));
});

test("MinionDetailScreen shows 'not found' when empty", async () => {
  const minions = [];
  const html = await renderDetail(minions, "/app/minions/nonexistent");
  assert.ok(html.includes("Minion not found."));
});

test("MinionDetailScreen renders auto schedule card for auto minions", async () => {
  const minions = [makeMinion({ type: "auto", triggerType: "automatic", interval: "5h" })];
  const html = await renderDetail(minions);
  assert.ok(html.includes("Auto schedule"));
  assert.ok(html.includes("5h"));
  assert.ok(!html.includes("How to summon"));
});

test("MinionDetailScreen renders active switch", async () => {
  const minions = [makeMinion({ slotIndex: 0 })];
  const html = await renderDetail(minions);
  assert.ok(html.includes("Active"));
});

test("MinionDetailScreen renders inactive state", async () => {
  const minions = [makeMinion({ slotIndex: null })];
  const html = await renderDetail(minions);
  assert.ok(html.includes("Inactive"));
});

test("MinionDetailScreen renders source and version", async () => {
  const minions = [makeMinion({ source: "market", version: "2.0.0" })];
  const html = await renderDetail(minions);
  assert.ok(html.includes("market") && html.includes("2.0.0"));
});

test("MinionDetailScreen renders technical details section", async () => {
  const minions = [makeMinion()];
  const html = await renderDetail(minions);
  assert.ok(html.includes("Technical details"));
  assert.ok(html.includes("User scoped. Defaults fork before edit."));
});

test("MinionDetailScreen picks first minion when id not found", async () => {
  const minions = [makeMinion({ id: "other-id", name: "Fallback Minion" })];
  const html = await renderDetail(minions, "/app/minions/no-match");
  assert.ok(html.includes("Fallback Minion"));
});
