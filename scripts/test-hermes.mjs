#!/usr/bin/env node
const BASE = process.env.HADES_E2E_BASE_URL || "https://hades-os-monorepo-production.up.railway.app";

const token = process.argv[2];
if (!token) {
  console.error("Usage: node scripts/test-hermes.mjs <jwt-token>");
  console.error("  or:  set JWT=<token> in your PowerShell and run:");
  console.error("       node scripts/test-hermes.mjs $env:JWT");
  process.exit(1);
}

async function main() {
  // 1. Session boot
  const sessRes = await fetch(`${BASE}/api/hades/hermes/sessions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: "{}",
  });
  const session = await sessRes.json();
  if (sessRes.status !== 200) {
    console.error("FAIL: session boot", sessRes.status, JSON.stringify(session));
    process.exit(1);
  }
  if (session.profileName === "anonymous_anonymous") {
    console.error("FAIL: session returned anonymous — JWT verification failed");
    process.exit(1);
  }
  console.log(`OK: session boot 200 — profile: ${session.profileName}, gateway: ${session.gatewayStatus}`);

  // 2. Send a message
  const msgRes = await fetch(`${session.hermesApiBaseUrl}/responses`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "hermes-agent",
      conversation: "health-check",
      input: [{ role: "user", content: [{ type: "input_text", text: "Say only: OK." }] }],
      store: false,
    }),
  });
  const msg = await msgRes.json();
  if (msgRes.status !== 200) {
    console.error(`FAIL: message send ${msgRes.status} — ${msg.error || msg.message || JSON.stringify(msg)}`);
    process.exit(1);
  }
  console.log(`OK: message send 200 — status: ${msg.status}`);

  console.log("\nAll checks passed. Hermes auth and gateway are working.");
}

main().catch((err) => {
  console.error("Script error:", err.message);
  process.exit(1);
});
