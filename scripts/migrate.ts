/**
 * Applies reviewed SQL migrations on the DIRECT connection as the owner role,
 * then ensures the runtime role can log in with APP_DB_PASSWORD.
 * Run once per deploy from a single controlled job (spec §28), never from app instances.
 */
import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

async function main() {
  const url = process.env.DATABASE_URL_DIRECT;
  if (!url) throw new Error("DATABASE_URL_DIRECT is required for migrations");
  const pool = new Pool({ connectionString: url, max: 1 });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: "src/db/migrations" });

  const pwd = process.env.APP_DB_PASSWORD;
  if (pwd) {
    // Parameterised via format() to avoid quoting mistakes; the owner may alter roles it created.
    await pool.query("SELECT format('ALTER ROLE cgh_app LOGIN PASSWORD %L', $1::text) AS stmt", [pwd]).then(async (r) => {
      await pool.query(r.rows[0].stmt);
    });
    console.log("runtime role cgh_app: login enabled");
  } else {
    console.log("APP_DB_PASSWORD not set: runtime role cgh_app left NOLOGIN");
  }
  await pool.end();
  console.log("migrations applied");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
