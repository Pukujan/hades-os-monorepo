import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_PATH = path.resolve(DIR, "../../pages/HadesPrototypeApp.jsx");

describe("Social connection state persistence", () => {
  test("HadesProvider stores social connection state with usePersistentState", () => {
    const source = readFileSync(APP_PATH, "utf8");

    assert.ok(
      source.includes("usePersistentState") && source.includes("telegramConnection"),
      "HadesProvider must store telegramConnection with usePersistentState.",
    );
    assert.ok(
      source.includes("usePersistentState") && source.includes("discordConnection"),
      "HadesProvider must store discordConnection with usePersistentState.",
    );
    assert.ok(
      source.includes("usePersistentState") && source.includes("githubConnection"),
      "HadesProvider must store githubConnection with usePersistentState.",
    );
    assert.ok(
      source.includes("usePersistentState") && source.includes("instagramConnection"),
      "HadesProvider must store instagramConnection with usePersistentState.",
    );
  });

  test("HadesProvider passes social connection state and handlers in context value", () => {
    const source = readFileSync(APP_PATH, "utf8");

    assert.ok(
      source.includes("telegramConnection") && source.includes("handleSaveTelegramToken"),
      "HadesProvider context must expose telegramConnection and its handlers.",
    );
    assert.ok(
      source.includes("discordConnection") && source.includes("handleSaveDiscordToken"),
      "HadesProvider context must expose discordConnection and its handlers.",
    );
    assert.ok(
      source.includes("githubConnection") && source.includes("handleSaveGithubToken"),
      "HadesProvider context must expose githubConnection and its handlers.",
    );
    assert.ok(
      source.includes("instagramConnection") && source.includes("handleCreateInstagramAuthLink"),
      "HadesProvider context must expose instagramConnection and its handlers.",
    );
  });

  test("SocialsScreen reads connection state from useHades context, not local useState", () => {
    const source = readFileSync(APP_PATH, "utf8");
    const socialsScreenStart = source.indexOf("function SocialsScreen");
    assert.ok(socialsScreenStart >= 0, "SocialsScreen function must exist.");

    const socialsScreenEnd = source.indexOf("function InboxScreen");
    const socialsBody = source.slice(socialsScreenStart, socialsScreenEnd);

    // Should NOT have useState declarations for connections
    const useStateMatches = socialsBody.match(/React\.useState/g) || [];
    assert.equal(
      useStateMatches.length, 0,
      "SocialsScreen must not declare any React.useState — all state should come from context.",
    );

    // Should destructure from useHades
    assert.ok(
      socialsBody.includes("const {") && socialsBody.includes("} = useHades()"),
      "SocialsScreen must read state by destructuring useHades().",
    );
  });
});
