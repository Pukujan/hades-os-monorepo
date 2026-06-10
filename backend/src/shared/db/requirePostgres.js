import { detectDatabaseKind } from "./openDatabase.js";

/**
 * App runtime (dev/prod) uses Neon Postgres only. SQLite is allowed when
 * ALLOW_SQLITE=true (integration tests) or the URL is explicitly postgres.
 * @param {string} databaseUrl
 * @param {string} [label]
 */
export function requirePostgresDatabaseUrl(databaseUrl, label = "DATABASE_URL") {
  if (process.env.ALLOW_SQLITE === "true") return;

  const kind = detectDatabaseKind(databaseUrl);
  if (kind === "postgres") return;

  throw new Error(
    `${label} must be a Postgres URL (postgresql://…). SQLite is disabled for local dev — set Neon DATABASE_URL in backend/.env. For tests only, set ALLOW_SQLITE=true.`
  );
}
