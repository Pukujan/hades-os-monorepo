import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const COMPONENT_PATH = path.resolve(DIR, "../../components/GitHubSetupCard.jsx");
const CSS_PATH = path.resolve(DIR, "../../../../styles/hadesPrototype.css");

describe("GitHubSetupCard layout structure", () => {
  test("GitHubSetupCard is a named function export", () => {
    const src = readFileSync(COMPONENT_PATH, "utf-8");
    assert.ok(src.includes("export function GitHubSetupCard"));
  });

  test("component source has data-testid='github-card' on the article", () => {
    const src = readFileSync(COMPONENT_PATH, "utf-8");
    const matches = src.match(/data-testid="github-card"/g);
    assert.ok(matches, "Missing data-testid=github-card");
    assert.ok(matches.length >= 1);
  });

  test("component source has data-testid='github-actions' on the actions wrapper", () => {
    const src = readFileSync(COMPONENT_PATH, "utf-8");
    const matches = src.match(/data-testid="github-actions"/g);
    assert.ok(matches, "Missing data-testid=github-actions");
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

  test("GitHub title has white-space: nowrap to prevent word splitting", () => {
    const src = readFileSync(COMPONENT_PATH, "utf-8");
    assert.ok(src.includes('whiteSpace: "nowrap"'), "Missing nowrap style on GitHub title");
  });
});

describe("GitHubSetupCard CSS layout rules", () => {
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
});
