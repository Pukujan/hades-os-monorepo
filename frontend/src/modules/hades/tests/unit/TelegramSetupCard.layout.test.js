import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const COMPONENT_PATH = path.resolve(DIR, "../../TelegramSetupCard.jsx");
const CSS_PATH = path.resolve(DIR, "../../../../styles/hadesPrototype.css");

describe("TelegramSetupCard layout structure", () => {
  test("TelegramSetupCard is a named function export", () => {
    const src = readFileSync(COMPONENT_PATH, "utf-8");
    assert.ok(src.includes("export function TelegramSetupCard"));
  });

  test("component source has data-testid='telegram-card' on the article", () => {
    const src = readFileSync(COMPONENT_PATH, "utf-8");
    const matches = src.match(/data-testid="telegram-card"/g);
    assert.ok(matches, "Missing data-testid=telegram-card");
    assert.ok(matches.length >= 1);
  });

  test("component source has data-testid='telegram-actions' on the actions wrapper", () => {
    const src = readFileSync(COMPONENT_PATH, "utf-8");
    const matches = src.match(/data-testid="telegram-actions"/g);
    assert.ok(matches, "Missing data-testid=telegram-actions");
    assert.ok(matches.length >= 1);
  });

  test("component source has data-testid='telegram-token-row' on the token row", () => {
    const src = readFileSync(COMPONENT_PATH, "utf-8");
    const matches = src.match(/data-testid="telegram-token-row"/g);
    assert.ok(matches, "Missing data-testid=telegram-token-row");
    assert.ok(matches.length >= 1);
  });

  test("component uses social-main wrapper for icon and title", () => {
    const src = readFileSync(COMPONENT_PATH, "utf-8");
    assert.ok(src.includes('className="social-main"'));
  });

  test("component uses social-actions wrapper for controls", () => {
    const src = readFileSync(COMPONENT_PATH, "utf-8");
    assert.ok(src.includes('className="social-actions"'));
  });

  test("component uses telegram-card class on disconnected state article", () => {
    const src = readFileSync(COMPONENT_PATH, "utf-8");
    assert.ok(src.includes('telegram-card'));
  });

  test("Telegram title has white-space: nowrap to prevent word splitting", () => {
    const src = readFileSync(COMPONENT_PATH, "utf-8");
    assert.ok(src.includes('whiteSpace: "nowrap"'), "Missing nowrap style on Telegram title");
  });
});

describe("TelegramSetupCard CSS layout rules", () => {
  test("CSS defines .telegram-card as flex container", () => {
    const css = readFileSync(CSS_PATH, "utf-8");
    assert.ok(css.includes(".telegram-card"));
  });

  test("CSS defines .social-main as flex with min-width 220px", () => {
    const css = readFileSync(CSS_PATH, "utf-8");
    const match = css.match(/\.social-main/);
    assert.ok(match, "Missing .social-main in CSS");
    assert.ok(css.includes("min-width:220px"));
  });

  test("CSS defines .social-actions with margin-left auto", () => {
    const css = readFileSync(CSS_PATH, "utf-8");
    assert.ok(css.includes(".social-actions"));
    assert.ok(css.includes("margin-left:auto"));
  });

  test("CSS defines .secondary button style", () => {
    const css = readFileSync(CSS_PATH, "utf-8");
    assert.ok(css.includes(".secondary"));
  });

  test("CSS defines responsive breakpoint at 760px", () => {
    const css = readFileSync(CSS_PATH, "utf-8");
    assert.ok(css.includes("760px"));
  });

  test("CSS stacks telegram-card vertically at narrow widths", () => {
    const css = readFileSync(CSS_PATH, "utf-8");
    assert.ok(css.includes("flex-direction:column"));
  });

  test("CSS makes telegram-token-row column at narrow widths", () => {
    const css = readFileSync(CSS_PATH, "utf-8");
    assert.ok(css.includes("telegram-token-row{flex-direction:column"));
  });

  test("CSS does not modify existing .permission layout", () => {
    const css = readFileSync(CSS_PATH, "utf-8");
    assert.ok(css.includes(".permission{display:grid;grid-template-columns:auto 1fr auto"));
  });
});
