import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const css = readFileSync(new URL("../../../../styles/hadesPrototype.css", import.meta.url), "utf8");
const loginTemplate = readFileSync(new URL("../../../../auth/loginTemplate.html", import.meta.url), "utf8");
const hadesPrototypeSource = readFileSync(new URL("../../pages/HadesPrototypeApp.jsx", import.meta.url), "utf8");

test("post-login shell defines contained scroll surfaces", () => {
  for (const selector of [
    ".content",
    ".contained-list",
    ".chat-log",
    ".detail-scroll",
    ".notification-body"
  ]) {
    const selectorPattern = selector.replace(".", "\\.");
    assert.match(css, new RegExp(`${selectorPattern}[^}]*min-height:\\s*0`, "s"));
  }

  assert.match(css, /\.viewport[^}]*display:\s*grid/s);
  assert.match(css, /\.phone[^}]*width:\s*min\(100vw,\s*430px\)/s);
  assert.match(css, /\.app[^}]*display:\s*grid/s);
});

test("bottom nav remains stable inside the app shell", () => {
  assert.match(css, /\.app[^}]*grid-template-rows:\s*auto\s+1fr\s+auto/s);
  assert.match(css, /\.nav[^}]*grid-template-columns:\s*repeat\(4,\s*1fr\)/s);
  assert.match(css, /\.screen[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.notification-menu[^}]*display:\s*none/s);
});

test("minions chat stretches to available space above the bottom nav", () => {
  assert.match(css, /\.minions-scroll[^}]*height:\s*100%/s);
  assert.match(css, /\.minions-scroll[^}]*display:\s*flex/s);
  assert.match(css, /\.minions-scroll \.chat-card[^}]*flex:\s*1 1 auto/s);
  assert.match(css, /\.minions-scroll \.chat-card\.expanded[^}]*height:\s*auto/s);
});

test("Hermes chat failures are logged to the browser console before local fallback", () => {
  assert.match(hadesPrototypeSource, /console\.error\("\[Hades chat\] Hermes request failed; using local fallback\."/);
  assert.match(hadesPrototypeSource, /requestId:\s*error\?\.requestId/);
  assert.match(hadesPrototypeSource, /responseBody:\s*error\?\.responseBody/);
});

test("approved login template remains untouched by post-login work", () => {
  assert.match(loginTemplate, /START THE FORGE/i);
  assert.match(loginTemplate, /or continue with/i);
});
