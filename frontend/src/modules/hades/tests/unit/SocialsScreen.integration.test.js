import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SOCIAL_LINKS } from "../../utils/hadesData.js";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_PATH = path.resolve(DIR, "../../pages/HadesPrototypeApp.jsx");

describe("SocialsScreen provider integration", () => {
  test("SOCIAL_LINKS includes discord provider", () => {
    const discord = SOCIAL_LINKS.find((s) => s.provider === "discord");
    assert.ok(discord, "discord provider missing from SOCIAL_LINKS");
    assert.equal(discord.status, "not_connected");
    assert.equal(discord.displayName, "Discord");
  });

  test("SOCIAL_LINKS includes github provider", () => {
    const github = SOCIAL_LINKS.find((s) => s.provider === "github");
    assert.ok(github, "github provider missing from SOCIAL_LINKS");
    assert.equal(github.status, "not_connected");
    assert.equal(github.displayName, "GitHub");
  });

  test("DiscordSetupCard is imported in HadesPrototypeApp", () => {
    const src = readFileSync(APP_PATH, "utf-8");
    assert.ok(
      src.includes('import { DiscordSetupCard } from'),
      "DiscordSetupCard must be imported in HadesPrototypeApp"
    );
  });

  test("GitHubSetupCard is imported in HadesPrototypeApp", () => {
    const src = readFileSync(APP_PATH, "utf-8");
    assert.ok(
      src.includes('import { GitHubSetupCard } from'),
      "GitHubSetupCard must be imported in HadesPrototypeApp"
    );
  });

  test("SocialsScreen renders DiscordSetupCard for discord provider", () => {
    const src = readFileSync(APP_PATH, "utf-8");
    const socialScreenMatch = src.match(/function SocialsScreen[\s\S]*?\n\}/);
    assert.ok(socialScreenMatch, "Could not find SocialsScreen function");
    const body = socialScreenMatch[0];
    assert.ok(
      body.includes('social.provider === "discord"'),
      "SocialsScreen must have a branch for discord provider"
    );
  });

  test("SocialsScreen renders GitHubSetupCard for github provider", () => {
    const src = readFileSync(APP_PATH, "utf-8");
    const socialScreenMatch = src.match(/function SocialsScreen[\s\S]*?\n\}/);
    assert.ok(socialScreenMatch, "Could not find SocialsScreen function");
    const body = socialScreenMatch[0];
    assert.ok(
      body.includes('social.provider === "github"'),
      "SocialsScreen must have a branch for github provider"
    );
  });
});
