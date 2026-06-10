import { readFileSync } from "fs";

/**
 * @param {import('@neondatabase/serverless').NeonQueryFunction} sql
 * @param {string} migrationSqlPath
 */
export async function runPostgresMigration(sql, migrationSqlPath) {
  const raw = readFileSync(migrationSqlPath, "utf8");
  const statements = raw
    .split(";")
    .map((part) => part.replace(/--[^\n]*/g, "").trim())
    .filter(Boolean);

  for (const statement of statements) {
    await sql.query(statement);
  }
}
