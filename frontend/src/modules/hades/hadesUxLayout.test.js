import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const css = readFileSync(new URL("../../styles/hades.css", import.meta.url), "utf8");
const loginTemplate = readFileSync(new URL("../../auth/loginTemplate.html", import.meta.url), "utf8");

test("post-login shell defines contained scroll surfaces", () => {
  for (const selector of [
    ".minion-list-scroll",
    ".past-summons-scroll",
    ".notification-log-scroll",
    ".detail-scroll",
    ".activity-log-scroll"
  ]) {
    const selectorPattern = selector.replace(".", "\\.");
    assert.match(css, new RegExp(`${selectorPattern}[^}]*overflow-y:\\s*auto`, "s"));
    assert.match(css, new RegExp(`${selectorPattern}[^}]*min-height:\\s*0`, "s"));
  }
});

test("bottom nav remains stable inside the app shell", () => {
  assert.match(css, /\.bottom-nav[^}]*position:\s*absolute/s);
  assert.match(css, /\.frame[^}]*min-height:\s*0/s);
  assert.match(css, /\.screen[^}]*overflow:\s*auto/s);
});

test("approved login template remains untouched by post-login work", () => {
  assert.match(loginTemplate, /START THE FORGE/i);
  assert.match(loginTemplate, /or continue with/i);
});

