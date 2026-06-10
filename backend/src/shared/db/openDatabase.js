import { neon } from "@neondatabase/serverless";
import { openSqliteDatabase } from "./sqlite.js";

/**
 * @param {string | undefined} databaseUrl
 * @returns {'postgres' | 'sqlite'}
 */
export function detectDatabaseKind(databaseUrl) {
  const trimmed = databaseUrl?.trim() ?? "";
  if (trimmed.startsWith("postgres://") || trimmed.startsWith("postgresql://")) {
    return "postgres";
  }
  return "sqlite";
}

/**
 * @typedef {{ kind: 'postgres', client: import('@neondatabase/serverless').NeonQueryFunction }} PostgresDatabase
 * @typedef {{ kind: 'sqlite', client: import('better-sqlite3').Database }} SqliteDatabase
 * @typedef {PostgresDatabase | SqliteDatabase} OpenDatabaseResult
 */

/**
 * @param {string} databaseUrl
 * @param {string} repoRoot
 * @returns {OpenDatabaseResult}
 */
export function openDatabase(databaseUrl, repoRoot) {
  const kind = detectDatabaseKind(databaseUrl);
  if (kind === "postgres") {
    return { kind: "postgres", client: neon(databaseUrl.trim()) };
  }
  return { kind: "sqlite", client: openSqliteDatabase(databaseUrl, repoRoot) };
}
