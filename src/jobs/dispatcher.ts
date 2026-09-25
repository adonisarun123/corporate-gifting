import "@/lib/server-guard";
import { hostname } from "node:os";
import type { Db } from "@/db/client";
import { claimBatch, completeEvent, failEvent } from "@/modules/outbox/service";
import { handlers } from "./handlers";

/** One pass: claim a leased batch, run handlers, mark done or schedule retry. Returns processed count. */
export async function dispatchOnce(db: Db, owner = `${hostname()}:${process.pid}`): Promise<number> {
  const batch = await claimBatch(db, owner);
  for (const row of batch) {
    try {
      for (const h of handlers[row.type] ?? []) await h(row, db);
      await completeEvent(db, row.id);
    } catch (e) {
      await failEvent(db, row, e instanceof Error ? e.message : String(e));
    }
  }
  return batch.length;
}
