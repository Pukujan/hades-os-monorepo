import { readFileSync, mkdirSync } from "fs";
import { dirname, join, isAbsolute } from "path";
import Database from "better-sqlite3";

/**
 * @param {string} databaseUrl
 * @param {string} repoRoot
 * @returns {import("better-sqlite3").Database}
 */
export function openSqliteDatabase(databaseUrl, repoRoot) {
  if (!databaseUrl?.trim()) {
    throw new Error("DATABASE_URL is required (e.g. file:./data/app.db)");
  }

  const trimmed = databaseUrl.trim();
  if (trimmed.includes("mode=memory") || trimmed === "file::memory:" || trimmed.endsWith(":memory:")) {
    const memoryPath = trimmed.startsWith("file:") ? trimmed.slice("file:".length) : trimmed;
    const db = new Database(memoryPath);
    db.pragma("foreign_keys = ON");
    return db;
  }

  let filePath = trimmed;
  if (filePath.startsWith("sqlite:")) {
    filePath = filePath.slice("sqlite:".length);
  } else if (filePath.startsWith("file:")) {
    filePath = filePath.slice("file:".length);
  }

  if (!isAbsolute(filePath)) {
    filePath = join(repoRoot, filePath);
  }

  mkdirSync(dirname(filePath), { recursive: true });
  const db = new Database(filePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

/**
 * @param {import("better-sqlite3").Database} db
 * @param {string} migrationSqlPath
 */
export function runSqlMigration(db, migrationSqlPath) {
  const sql = readFileSync(migrationSqlPath, "utf8");
  db.exec(sql);
}
