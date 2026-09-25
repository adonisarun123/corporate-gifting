import { and, count, eq, lt, sql, sum } from "drizzle-orm";
import { getDb, withContextTransaction, type Db } from "@/db/client";
import { enquiries, outboxEvents, productRevisions, productSupplySummaries, products, quoteRevisions, supplierRequests } from "@/db/schema";
import { platformContext, requireUser, type Actor } from "@/modules/identity/actor";
import { forbidden } from "@/lib/errors";

export async function getDashboardCounts(actor: Actor, db: Db = getDb()) {
  const user = requireUser(actor);
  if (user.platformRoles.length === 0) throw forbidden();
  return withContextTransaction(
    platformContext(user),
    async (tx) => {
      const c = async (q: Promise<Array<{ n: number }>>) => Number((await q)[0]?.n ?? 0);
      return {
        submittedEnquiries: await c(tx.select({ n: count() }).from(enquiries).where(eq(enquiries.status, "submitted"))),
        sourcingEnquiries: await c(tx.select({ n: count() }).from(enquiries).where(eq(enquiries.status, "sourcing"))),
        pendingRevisions: await c(tx.select({ n: count() }).from(productRevisions).where(eq(productRevisions.reviewStatus, "submitted"))),
        overdueSupplierRequests: await c(tx.select({ n: count() }).from(supplierRequests).where(and(eq(supplierRequests.status, "sent"), lt(supplierRequests.dueAt, sql`now()`)))),
        openQuotes: await c(tx.select({ n: count() }).from(quoteRevisions).where(sql`${quoteRevisions.status} in ('issued','viewed')`)),
        staleStockProducts: await c(tx.select({ n: count() }).from(products).innerJoin(productSupplySummaries, eq(productSupplySummaries.productId, products.id)).where(and(eq(products.lifecycle, "published"), sql`${productSupplySummaries.stockState} in ('stale','unknown')`))),
        deadOutbox: await c(tx.select({ n: count() }).from(outboxEvents).where(eq(outboxEvents.status, "dead"))),
      };
    },
    db,
  );
}

/** Funnel values kept distinct (spec §12): enquiry count, quoted value, accepted value. */
export async function getFunnel(actor: Actor, db: Db = getDb()) {
  const user = requireUser(actor);
  if (user.platformRoles.length === 0) throw forbidden();
  return withContextTransaction(
    platformContext(user),
    async (tx) => {
      const byStatus = await tx.select({ status: enquiries.status, n: count() }).from(enquiries).groupBy(enquiries.status);
      const quoted = await tx.select({ total: sum(quoteRevisions.totalMinor) }).from(quoteRevisions).where(sql`${quoteRevisions.status} in ('issued','viewed','revision_requested')`);
      const accepted = await tx.select({ total: sum(quoteRevisions.totalMinor) }).from(quoteRevisions).where(eq(quoteRevisions.status, "accepted"));
      return { byStatus, quotedValueMinor: Number(quoted[0]?.total ?? 0), acceptedValueMinor: Number(accepted[0]?.total ?? 0) };
    },
    db,
  );
}
