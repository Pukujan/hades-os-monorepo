import { once } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';

const BASE = 'https://hades-os-monorepo-production.up.railway.app';
const TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;

async function fetchWithRetry(url, label, opts = {}) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...opts, signal: controller.signal });
      clearTimeout(timer);
      const text = await res.text();
      console.log(`  ✓ ${label} -> ${res.status}`);
      return { ok: res.ok, status: res.status, body: text };
    } catch (err) {
      clearTimeout(timer);
      if (attempt < MAX_RETRIES) {
        console.log(`  ⚠ ${label} attempt ${attempt} failed: ${err.message} — retrying...`);
        await sleep(2000);
      } else {
        console.log(`  ✗ ${label} failed after ${MAX_RETRIES} attempts: ${err.message}`);
        return { ok: false, status: 0, body: err.message };
      }
    }
  }
}

async function main() {
  console.log(`\n=== Railway smoke test ===\nTarget: ${BASE}\n`);

  // 1. Health check
  const health = await fetchWithRetry(`${BASE}/api/health`, 'GET /api/health');
  if (health.body) console.log(`     body: ${health.body.slice(0, 200)}`);

  // 2. Root
  const root = await fetchWithRetry(`${BASE}/`, 'GET /');
  if (root.body) console.log(`     body: ${root.body.slice(0, 200)}`);

  // 3. Hades API health
  const hades = await fetchWithRetry(`${BASE}/api/hades/health`, 'GET /api/hades/health');
  if (hades.body) console.log(`     body: ${hades.body.slice(0, 200)}`);

  // 4. Hermes state index
  const state = await fetchWithRetry(`${BASE}/api/hades/hermes/state-index`, 'GET /api/hades/hermes/state-index');
  if (state.body) console.log(`     body: ${state.body.slice(0, 200)}`);

  // 5. Bootstrap (edge routes)
  const boot = await fetchWithRetry(`${BASE}/api/hades/hermes/bootstrap`, 'GET /api/hades/hermes/bootstrap');
  if (boot.body) console.log(`     body: ${boot.body.slice(0, 200)}`);

  // 6. Session list
  const sessions = await fetchWithRetry(`${BASE}/api/hades/hermes/sessions`, 'GET /api/hades/hermes/sessions');
  if (sessions.body) console.log(`     body: ${sessions.body.slice(0, 200)}`);

  console.log('\n=== Done ===');
}

main().catch(console.error);
