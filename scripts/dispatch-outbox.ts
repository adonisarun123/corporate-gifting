/** Durable dispatcher loop for local/VM use. In production, run this as a worker or wire handlers into Inngest. */
import "dotenv/config";
import { getDb, getPool } from "@/db/client";
import { dispatchOnce } from "@/jobs/dispatcher";

const once = process.argv.includes("--once");
async function main() {
  const db = getDb();
  do {
    const n = await dispatchOnce(db);
    if (once) break;
    await new Promise((r) => setTimeout(r, n > 0 ? 200 : 2000));
  } while (true);
  await getPool().end();
}
main().catch((e) => { console.error(e); process.exit(1); });
