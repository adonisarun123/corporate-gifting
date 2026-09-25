import { sql } from "drizzle-orm";
import type { Tx } from "@/db/client";

type Kind = "enquiry" | "quote" | "vendor" | "product" | "combo" | "supplier_request";

/**
 * Race-free reference allocation: one row per (kind, period) locked and incremented
 * in the caller's transaction. No MAX+1.
 */
export async function allocateReference(tx: Tx, kind: Kind, now = new Date()): Promise<string> {
  const year = String(now.getUTCFullYear());
  const period = kind === "vendor" || kind === "product" || kind === "combo" ? "all" : year;
  const res = await tx.execute<{ next_value: number }>(sql`
    insert into reference_counters (kind, period, next_value) values (${kind}, ${period}, 2)
    on conflict (kind, period) do update set next_value = reference_counters.next_value + 1
    returning next_value - 1 as next_value`);
  const n = Number(res.rows[0]?.next_value);
  if (!Number.isFinite(n)) throw new Error("reference allocation failed");
  switch (kind) {
    case "enquiry":
      return `CGE-${year}-${String(n).padStart(6, "0")}`;
    case "quote":
      return `CGQ-${year}-${String(n).padStart(6, "0")}`;
    case "supplier_request":
      return `SRQ-${year}-${String(n).padStart(6, "0")}`;
    case "vendor":
      return `VEN-${String(n).padStart(4, "0")}`;
    case "product":
      return `CGH-P-${String(n).padStart(6, "0")}`;
    case "combo":
      return `CGH-K-${String(n).padStart(6, "0")}`;
  }
}

export const quoteRevisionNumber = (family: string, revisionNo: number) => `${family}-R${String(revisionNo).padStart(2, "0")}`;
