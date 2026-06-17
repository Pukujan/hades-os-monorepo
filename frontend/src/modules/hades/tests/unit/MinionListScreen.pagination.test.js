import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";
import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";

function makeMinion(index) {
  return {
    id: `minion-${index}`,
    name: `Minion ${index}`,
    description: `Description ${index}`,
    type: index % 2 === 0 ? "manual" : "auto",
    slotIndex: index % 3 === 0 ? 0 : null,
  };
}

function renderList(minions) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`, {
    url: "http://localhost/app/minions/list",
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
      const { MinionListScreen } = await import("../../pages/MinionListScreen.jsx");
      await act(async () => {
        root.render(
          React.createElement(MemoryRouter, { initialEntries: ["/app/minions/list"] },
            React.createElement(MinionListScreen, { minions })
          )
        );
      });
    },
    async clickNext() {
      const nextButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Next"));
      assert.ok(nextButton, "Next page button should exist");
      await act(async () => {
        nextButton.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true }));
      });
    },
  };
}

test("MinionListScreen paginates more than ten minions", async () => {
  const ui = renderList(Array.from({ length: 18 }, (_, index) => makeMinion(index + 1)));
  try {
    await ui.render();
    assert.equal(ui.container.textContent.includes("Minion 1"), true);
    assert.equal(ui.container.textContent.includes("Minion 11"), false);
    await ui.clickNext();
    assert.equal(ui.container.textContent.includes("Minion 11"), true);
  } finally {
    ui.root.unmount();
  }
});
