import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { showInlineError, showConfirmationMessage, showSuccessMessage } from "./loginHelpers.js";

function setup() {
  const dom = new JSDOM(`<!DOCTYPE html><div class="login-root"><div class="panel-wrap"></div></div>`);
  const doc = dom.window.document;
  const root = doc.querySelector(".login-root");
  const panelWrap = doc.querySelector(".panel-wrap");
  return { dom, doc, root, panelWrap };
}

describe("showInlineError", () => {
  test("creates error-message div as first child of panelWrap", () => {
    const { root, panelWrap } = setup();
    showInlineError(root, panelWrap, "Something went wrong");
    const el = panelWrap.querySelector(".error-message");
    assert.ok(el, "error-message element should exist");
    assert.equal(el.textContent, "Something went wrong");
    assert.equal(panelWrap.children[0], el, "error-message should be first child");
  });

  test("updates existing error-message text on second call", () => {
    const { root, panelWrap } = setup();
    showInlineError(root, panelWrap, "First error");
    showInlineError(root, panelWrap, "Second error");
    const errors = panelWrap.querySelectorAll(".error-message");
    assert.equal(errors.length, 1, "should still be exactly one error element");
    assert.equal(errors[0].textContent, "Second error");
  });

  test("handles missing panelWrap without crashing", () => {
    const { root } = setup();
    assert.doesNotThrow(() => showInlineError(root, null, "no panel"));
  });
});

describe("showConfirmationMessage", () => {
  test("replaces panelWrap content with confirmation message", () => {
    const { panelWrap } = setup();
    showConfirmationMessage(panelWrap);
    const el = panelWrap.querySelector(".confirmation-message");
    assert.ok(el, "confirmation-message element should exist");
    assert.ok(el.textContent.includes("Check your email"), "should contain confirmation text");
    assert.ok(el.textContent.includes("confirmation link"), "should mention confirmation link");
  });

  test("handles missing panelWrap without crashing", () => {
    assert.doesNotThrow(() => showConfirmationMessage(null));
  });
});

describe("showSuccessMessage", () => {
  test("replaces panelWrap content with success message", () => {
    const { panelWrap } = setup();
    showSuccessMessage(panelWrap, "Password reset link sent.");
    const el = panelWrap.querySelector(".success-message");
    assert.ok(el, "success-message element should exist");
    assert.ok(el.textContent.includes("Password reset link sent."), "should contain the provided message");
  });

  test("handles missing panelWrap without crashing", () => {
    assert.doesNotThrow(() => showSuccessMessage(null, "test"));
  });

  test("renders arbitrary message strings", () => {
    const { panelWrap } = setup();
    showSuccessMessage(panelWrap, "Operation completed successfully.");
    assert.ok(panelWrap.innerHTML.includes("Operation completed successfully."));
  });
});
