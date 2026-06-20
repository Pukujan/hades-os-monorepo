import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import { createHermesProfileProvisioner } from "../../runtime/hermesProfileProvisioner.js";
import { createHermesProfileSessionBroker } from "../../runtime/hermesProfileSessionBroker.js";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const HADES_SOUL_PATH = path.resolve(DIR, "../../souls/hades.soul.md");

function createWriter() {
  const writes = [];
  return {
    writes,
    writeFile: async (filePath, content) => {
      writes.push({ filePath: filePath.replace(/\\/g, "/"), content });
    },
  };
}

describe("Hermes profile soul/history persistence", () => {
  test("new profiles seed SOUL.md from canonical hades.soul.md", async () => {
    const { writes, writeFile } = createWriter();
    const provisioner = createHermesProfileProvisioner({
      profilesRoot: "/srv/hermes/profiles",
      writeFile,
      allocatePort: async () => 8657,
      generateApiServerKey: () => "profile-secret",
    });

    await provisioner.ensureProfile({ tenantId: "tenant_a", userId: "user_a" });

    const soulWrite = writes.find((entry) => entry.filePath.endsWith("/tenant_a_user_a/SOUL.md"));
    const canonicalSoul = readFileSync(HADES_SOUL_PATH, "utf8");

    assert.ok(soulWrite, "new profile creation must write a SOUL.md seed");
    assert.equal(soulWrite.content.trim(), canonicalSoul.trim());
    assert.match(soulWrite.content, /cute anime girl gif/);
  });

  test("existing profile refresh does not overwrite SOUL.md, config.yaml, or state.db", async () => {
    const { writes, writeFile } = createWriter();
    const provisioner = createHermesProfileProvisioner({
      profilesRoot: "/srv/hermes/profiles",
      writeFile,
      allocatePort: async () => 9000,
      generateApiServerKey: () => "new-secret",
    });

    await provisioner.ensureProfile({
      tenantId: "tenant_a",
      userId: "user_a",
      apiServerKey: "existing-secret",
      apiPort: 8657,
      telegramBotToken: "123456:USER_A",
    });

    const paths = writes.map((entry) => entry.filePath);

    assert.ok(paths.some((filePath) => filePath.endsWith("/tenant_a_user_a/.env")), "existing refresh may update runtime .env");
    assert.ok(!paths.some((filePath) => filePath.endsWith("/tenant_a_user_a/SOUL.md")), "existing refresh must preserve user-edited SOUL.md");
    assert.ok(!paths.some((filePath) => filePath.endsWith("/tenant_a_user_a/config.yaml")), "existing refresh must preserve user-edited config.yaml");
    assert.ok(!paths.some((filePath) => filePath.endsWith("/tenant_a_user_a/state.db")), "existing refresh must never wipe Hermes session history");
  });

  test("profile provisioner never creates an empty state.db placeholder", async () => {
    const { writes, writeFile } = createWriter();
    const provisioner = createHermesProfileProvisioner({
      profilesRoot: "/srv/hermes/profiles",
      writeFile,
      allocatePort: async () => 8657,
      generateApiServerKey: () => "profile-secret",
    });

    await provisioner.ensureProfile({ tenantId: "tenant_a", userId: "user_a" });

    assert.ok(!writes.some((entry) => entry.filePath.endsWith("/state.db")), "Hermes must create/manage state.db itself");
  });

  test("server-level Telegram token is not copied into profiles without a user-owned token", async () => {
    const { writes, writeFile } = createWriter();
    const provisioner = createHermesProfileProvisioner({
      profilesRoot: "/srv/hermes/profiles",
      serverEnv: { TELEGRAM_BOT_TOKEN: "999:SERVER_LEVEL_TOKEN" },
      writeFile,
      allocatePort: async () => 8657,
      generateApiServerKey: () => "profile-secret",
    });

    await provisioner.ensureProfile({ tenantId: "tenant_b", userId: "user_b" });

    const envWrite = writes.find((entry) => entry.filePath.endsWith("/tenant_b_user_b/.env"));
    assert.ok(envWrite, "profile .env should still be written");
    assert.doesNotMatch(envWrite.content, /TELEGRAM_BOT_TOKEN=999:SERVER_LEVEL_TOKEN/);
  });
});

describe("Hermes profile session auth isolation", () => {
  test("session start fails closed instead of creating an anonymous shared profile", async () => {
    let ensureProfileCalled = false;
    const broker = createHermesProfileSessionBroker({
      auth: {
        verifySupabaseJwt: async () => ({ userId: "anonymous", tenantId: "anonymous" }),
      },
      profileRegistry: {
        ensureProfile: async () => {
          ensureProfileCalled = true;
          return {
            profileName: "anonymous_anonymous",
            apiBaseUrl: "http://127.0.0.1:8657",
          };
        },
      },
      profileRouter: {
        publicRouteForProfile: async () => ({
          hermesApiBaseUrl: "/api/hades/hermes/anonymous_anonymous/v1",
          authMode: "edge_injected",
        }),
      },
      routingToken: {
        issueTask: async () => ({ routingToken: "route-anonymous" }),
      },
    });

    await assert.rejects(
      () => broker.startSession({ supabaseJwt: null }),
      (error) => error?.status === 401 && error?.code === "missing_auth",
    );
    assert.equal(ensureProfileCalled, false);
  });
});
