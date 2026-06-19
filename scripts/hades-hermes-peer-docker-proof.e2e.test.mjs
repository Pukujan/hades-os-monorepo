import { test, describe } from "node:test";
import assert from "node:assert/strict";

const enabled = process.env.HADES_HERMES_PEER_PROOF_E2E === "1";
const hadesBaseUrl = process.env.HADES_E2E_BASE_URL;
const authToken = process.env.HADES_E2E_AUTH_TOKEN;
const profileProofUrl = process.env.HADES_E2E_PROFILE_PROOF_URL;
const snapshotProofUrl = process.env.HADES_E2E_PROFILE_SNAPSHOT_URL;
const restartHookUrl = process.env.HADES_E2E_RESTART_HOOK_URL;
const restartWaitMs = Number(process.env.HADES_E2E_RESTART_WAIT_MS || 30000);
const hermesProofPath = process.env.HADES_E2E_HERMES_PROOF_PATH || "/models";

function assertNoSecrets(value) {
  const serialized = JSON.stringify(value);
  assert.equal(serialized.includes("API_SERVER_KEY"), false);
  assert.equal(serialized.includes("profile-static-secret"), false);
  assert.equal(serialized.includes("TELEGRAM_BOT_TOKEN"), false);
  assert.equal(serialized.includes("DISCORD_BOT_TOKEN"), false);
  assert.equal(serialized.includes("SLACK_BOT_TOKEN"), false);
  assert.equal(serialized.includes("OPENROUTER_API_KEY"), false);
  assert.equal(serialized.includes("SUPABASE_SERVICE_ROLE"), false);
  assert.equal(serialized.includes("raw-token"), false);
  assert.equal(serialized.includes("sk-"), false);
}

function requireProof(t) {
  if (!enabled) {
    t.skip("Set HADES_HERMES_PEER_PROOF_E2E=1 to run local Docker/Railway proof checks.");
    return false;
  }
  assert.ok(hadesBaseUrl, "HADES_E2E_BASE_URL is required");
  assert.ok(authToken, "HADES_E2E_AUTH_TOKEN is required");
  assert.ok(profileProofUrl, "HADES_E2E_PROFILE_PROOF_URL is required");
  assert.ok(snapshotProofUrl, "HADES_E2E_PROFILE_SNAPSHOT_URL is required");
  assert.ok(restartHookUrl, "HADES_E2E_RESTART_HOOK_URL is required");
  return true;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      accept: "application/json",
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { response, body, text };
}

function joinEdgeUrl(base, path) {
  const url = new URL(base);
  const basePath = url.pathname.replace(/\/+$/, "");
  let requestPath = String(path || "").replace(/^\/+/, "");

  if (basePath.endsWith("/v1") && requestPath.startsWith("v1/")) {
    requestPath = requestPath.slice(3);
  }

  url.pathname = `${basePath}/${requestPath}`.replace(/\/{2,}/g, "/");
  return url;
}

async function hadesRequest(path, options = {}) {
  return requestJson(new URL(path, hadesBaseUrl), {
    ...options,
    headers: {
      authorization: `Bearer ${authToken}`,
      ...(options.headers || {}),
    },
  });
}

async function startSession() {
  const session = await hadesRequest("/api/hades/hermes/sessions", {
    method: "POST",
    body: JSON.stringify({
      clientSessionId: `proof-session-${Date.now()}`,
      requestedSurface: "api_server",
    }),
  });

  assert.equal(session.response.ok, true, session.text);
  assert.equal(session.body.authMode, "edge_injected");
  assert.equal(typeof session.body.profileName, "string");
  assert.equal(typeof session.body.hermesApiBaseUrl, "string");
  assert.equal(Object.hasOwn(session.body, "apiServerKey"), false);
  assert.equal(Object.hasOwn(session.body, "hermesApiHeaders"), false);
  assert.doesNotMatch(session.body.hermesApiBaseUrl, /127\.0\.0\.1|localhost|\/api\/hades\/hermes\/tasks/);
  assertNoSecrets(session.body);
  return session.body;
}

async function profileProof(profileName) {
  const url = new URL(profileProofUrl);
  url.searchParams.set("profileName", profileName);
  const result = await requestJson(url, {
    headers: { authorization: `Bearer ${authToken}` },
  });
  assert.equal(result.response.ok, true, result.text);
  assertNoSecrets(result.body);
  return result.body;
}

async function snapshotProof(profileName) {
  const result = await requestJson(snapshotProofUrl, {
    method: "POST",
    headers: { authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ profileName, reason: "final-proof" }),
  });
  assert.equal(result.response.ok, true, result.text);
  assertNoSecrets(result.body);
  return result.body;
}

describe("Hades/Hermes peer Docker/Railway proof E2E", () => {
  test("session bootstrap returns only edge route while proof hook confirms private loopback profile target", async (t) => {
    if (!requireProof(t)) return;

    const session = await startSession();
    const proof = await profileProof(session.profileName);

    assert.equal(proof.profileName, session.profileName);
    assert.equal(proof.hermesApiBaseUrl, session.hermesApiBaseUrl);
    assert.equal(proof.authMode, "edge_injected");
    assert.match(proof.apiHost, /^(127\.0\.0\.1|localhost|::1|.+\.internal)$/);
    assert.notEqual(proof.apiHost, "0.0.0.0");
    assert.equal(typeof proof.apiPort, "number");
    assert.ok(proof.apiServerKeyHash);
    assert.equal(Object.hasOwn(proof, "apiServerKey"), false);
    assert.equal(Object.hasOwn(proof, "rawEnv"), false);
    assert.equal(Object.hasOwn(proof, "publicDirectUrl"), false);
  });

  test("profile home is on persistent Railway/Docker volume and contains durable Hermes state paths", async (t) => {
    if (!requireProof(t)) return;

    const session = await startSession();
    const proof = await profileProof(session.profileName);

    assert.ok(proof.profilesRoot, "proof must expose redacted profilesRoot");
    assert.ok(proof.hermesHome, "proof must expose redacted hermesHome");
    assert.equal(proof.hermesHome.startsWith(proof.profilesRoot), true);
    assert.doesNotMatch(proof.hermesHome, /^\/app(\/|$)/);
    assert.doesNotMatch(proof.profilesRoot, /^\/app(\/|$)/);

    if (proof.platform === "railway") {
      assert.ok(proof.railwayVolumeMountPath, "Railway proof must expose RAILWAY_VOLUME_MOUNT_PATH");
      assert.equal(proof.profilesRoot.startsWith(proof.railwayVolumeMountPath), true);
      assert.equal(proof.hermesHome.startsWith(proof.railwayVolumeMountPath), true);
    }

    assert.equal(proof.state?.hasStateDb, true);
    assert.equal(proof.state?.hasSessionsDir, true);
    assert.equal(proof.state?.hasMemoriesDir, true);
    assert.equal(proof.state?.hasEnvFile, true);
    assert.equal(proof.state?.envReturned, false);
  });

  test("edge route reaches Hermes API while direct profile target stays private", async (t) => {
    if (!requireProof(t)) return;

    const session = await startSession();
    const edge = await requestJson(joinEdgeUrl(session.hermesApiBaseUrl, hermesProofPath), {
      headers: { authorization: `Bearer ${authToken}` },
    });

    assert.equal(edge.response.ok, true, edge.text);
    assertNoSecrets(edge.body);

    const proof = await profileProof(session.profileName);
    assert.equal(proof.directBrowserReachable, false);
    assert.equal(proof.rawProfilePortPublic, false);
  });

  test("private profile snapshot includes state/session/memory metadata but no public URLs or secrets", async (t) => {
    if (!requireProof(t)) return;

    const session = await startSession();
    const snapshot = await snapshotProof(session.profileName);

    assert.match(snapshot.objectKey, /^profiles\/.+\/users\/.+\/.+\/snapshots\//);
    assert.equal(snapshot.visibility, "private");
    assert.equal(snapshot.secretStripped, true);
    assert.equal(Object.hasOwn(snapshot, "publicUrl"), false);
    assert.equal(Object.hasOwn(snapshot, "signedUrl"), false);
    assert.ok(snapshot.includes.includes("state.db"));
    assert.ok(snapshot.includes.includes("sessions/"));
    assert.ok(snapshot.includes.includes("memories/"));
  });

  test("restart proof keeps same user on same profile and preserves state metadata", async (t) => {
    if (!requireProof(t)) return;

    const before = await startSession();
    const marker = `final-proof-${Date.now()}`;
    const write = await hadesRequest("/api/hades/hermes/state-index", {
      method: "POST",
      body: JSON.stringify({
        profileName: before.profileName,
        eventType: "final_proof_restart_marker",
        objectKey: `profiles/${before.profileName}/sessions/${marker}.json`,
        contentHash: marker,
      }),
    });

    assert.equal(write.response.ok, true, write.text);
    assertNoSecrets(write.body);

    const restart = await fetch(restartHookUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${authToken}` },
    });
    assert.equal(restart.ok, true, await restart.text());
    await sleep(restartWaitMs);

    const after = await startSession();
    assert.equal(after.profileName, before.profileName);
    assert.equal(after.hermesApiBaseUrl, before.hermesApiBaseUrl);

    const proof = await profileProof(after.profileName);
    assert.equal(proof.state?.hasStateDb, true);
    assert.equal(proof.state?.hasSessionsDir, true);
    assert.equal(proof.state?.hasMemoriesDir, true);

    const state = await hadesRequest(
      `/api/hades/hermes/state-index?profileName=${encodeURIComponent(after.profileName)}&contentHash=${encodeURIComponent(marker)}`
    );
    assert.equal(state.response.ok, true, state.text);
    assert.equal(JSON.stringify(state.body).includes(marker), true);
    assertNoSecrets(state.body);
  });
});
