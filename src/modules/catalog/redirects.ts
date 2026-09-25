import { eq } from "drizzle-orm";
import { getDb, withContextTransaction, type Db } from "@/db/client";
import { slugRedirects } from "@/db/schema";
import { visitorContext } from "@/modules/identity/actor";

export async function lookupRedirect(fromPath: string, db: Db = getDb()): Promise<string | null> {
  const row = await withContextTransaction(visitorContext("public"), (tx) => tx.query.slugRedirects.findFirst({ where: eq(slugRedirects.fromPath, fromPath) }), db);
  return row?.toPath ?? null;
}
