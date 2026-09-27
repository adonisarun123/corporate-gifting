/** Drops and recreates the public schema of the DIRECT database, then re-applies migrations. Local/test only. */
import "dotenv/config";
import { config } from "dotenv";
import { Pool } from "pg";
import { normalizeSslMode } from "../src/db/connection-url";
import { execSync } from "node:child_process";

config({ path: ".env.test", override: process.argv.includes("--test") });

async function main() {
  const url = process.env.DATABASE_URL_DIRECT!;
  if (!/localhost|127\.0\.0\.1/.test(url)) throw new Error("reset-local refuses to run against a non-local database");
  const pool = new Pool({ connectionString: normalizeSslMode(url), max: 1 });
  await pool.query("drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;");
  await pool.end();
  execSync("npx tsx scripts/migrate.ts", { stdio: "inherit", env: process.env });
}
main().catch((e) => { console.error(e); process.exit(1); });
