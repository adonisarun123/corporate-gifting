import { apiHandler, json } from "@/lib/api/handler";
import { getPool } from "@/db/client";

export const GET = apiHandler(async () => {
  await getPool().query("select 1");
  return json({ ok: true });
});
