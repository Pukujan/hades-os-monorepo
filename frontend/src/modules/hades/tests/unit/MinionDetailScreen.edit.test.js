import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";
import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

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
    ...overrides,
  };
}

function ForgeProbe() {
  const location = useLocation();
  return React.createElement("div", { "data-testid": "forge-page" }, `${location.pathname}${location.search}`);
}

function renderDetail(minions) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`, {
    url: "http://localhost/app/minions/minion-test-1",
  });

  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.Node = dom.window.Node;
  globalThis.MutationObserver = dom.window.MutationObserver;

  const container = dom.window.document.getElementById("root");
  const root = createRoot(container);

  return {
    dom,
    root,
    container,
    async render() {
      const { MinionDetailScreen } = await import("../../pages/MinionDetailScreen.jsx");
      await act(async () => {
        root.render(
          React.createElement(MemoryRouter, { initialEntries: ["/app/minions/minion-test-1"] },
            React.createElement(Routes, null,
              React.createElement(Route, {
                path: "/app/minions/:id",
                element: React.createElement(MinionDetailScreen, {
                  minions,
                  onActivate: () => {},
                  onDeactivate: () => {},
                }),
              }),
              React.createElement(Route, { path: "/forge", element: React.createElement(ForgeProbe) })
            )
          )
        );
      });
    },
    async clickEdit() {
      const editButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Edit minion"));
      assert.ok(editButton, "Edit minion button should exist");
      await act(async () => {
        editButton.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true }));
      });
    },
  };
}

test("MinionDetailScreen edit button routes into Forge with the minion id", async () => {
  const ui = renderDetail([makeMinion()]);
  try {
    await ui.render();
    await ui.clickEdit();
    assert.equal(ui.container.textContent.includes("/forge?edit=minion-test-1"), true);
  } finally {
    ui.root.unmount();
  }
});
