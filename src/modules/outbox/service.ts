import { and, eq, inArray, lte, or, isNull, sql } from "drizzle-orm";
import type { Db, Tx } from "@/db/client";
import { outboxEvents, processedEvents } from "@/db/schema";

export type OutboxEventType =
  | "catalog.product.published"
  | "catalog.product.unpublished"
  | "supply.offer.updated"
  | "supply.stock.updated"
  | "enquiry.submitted"
  | "enquiry.status_changed"
  | "sourcing.request.sent"
  | "sourcing.response.received"
  | "quote.issued"
  | "quote.accepted"
  | "vendor.invited";

/** Append inside the business transaction. */
export async function appendOutbox(
  tx: Tx,
  input: { type: OutboxEventType; entityType: string; entityId: string; payload?: Record<string, unknown>; correlationId?: string | null },
): Promise<string> {
  const [row] = await tx
    .insert(outboxEvents)
    .values({
      type: input.type,
      entityType: input.entityType,
      entityId: input.entityId,
      payload: input.payload ?? {},
      correlationId: input.correlationId ?? null,
    })
    .returning({ id: outboxEvents.id });
  if (!row) throw new Error("outbox insert failed");
  return row.id;
}

export type OutboxRow = typeof outboxEvents.$inferSelect;

/**
 * Claim a batch with a lease so two dispatchers cannot process the same row.
 * Uses SKIP LOCKED; a stale lease (crashed worker) becomes claimable after lease_until.
 */
export async function claimBatch(db: Db, owner: string, limit = 20, leaseSeconds = 60): Promise<OutboxRow[]> {
  return db.transaction(async (tx) => {
    const candidates = await tx
      .select({ id: outboxEvents.id })
      .from(outboxEvents)
      .where(
        and(
          or(eq(outboxEvents.status, "pending"), and(eq(outboxEvents.status, "processing"), lte(outboxEvents.leaseUntil, sql`now()`))),
          lte(outboxEvents.availableAt, sql`now()`),
        ),
      )
      .orderBy(outboxEvents.availableAt)
      .limit(limit)
      .for("update", { skipLocked: true });
    if (candidates.length === 0) return [];
    const ids = candidates.map((c) => c.id);
    return tx
      .update(outboxEvents)
      .set({
        status: "processing",
        leaseOwner: owner,
        leaseUntil: sql`now() + make_interval(secs => ${leaseSeconds})`,
        attempts: sql`${outboxEvents.attempts} + 1`,
      })
      .where(inArray(outboxEvents.id, ids))
      .returning();
  });
}

/** Per-handler idempotency: returns false if this handler already processed the event. */
export async function markProcessed(tx: Tx, eventId: string, handler: string): Promise<boolean> {
  const res = await tx.insert(processedEvents).values({ eventId, handler }).onConflictDoNothing().returning();
  return res.length > 0;
}

export async function completeEvent(db: Db, id: string): Promise<void> {
  await db
    .update(outboxEvents)
    .set({ status: "done", processedAt: sql`now()`, leaseOwner: null, leaseUntil: null })
    .where(eq(outboxEvents.id, id));
}

export async function failEvent(db: Db, row: OutboxRow, error: string): Promise<void> {
  const dead = row.attempts >= row.maxAttempts;
  const backoffSeconds = Math.min(3600, 2 ** row.attempts * 15);
  await db
    .update(outboxEvents)
    .set({
      status: dead ? "dead" : "pending",
      lastError: error.slice(0, 2000),
      leaseOwner: null,
      leaseUntil: null,
      availableAt: dead ? row.availableAt : sql`now() + make_interval(secs => ${backoffSeconds})`,
    })
    .where(eq(outboxEvents.id, row.id));
}

/** Manual replay of a dead event by an operator. */
export async function replayEvent(db: Db, id: string): Promise<void> {
  await db
    .update(outboxEvents)
    .set({ status: "pending", attempts: 0, availableAt: sql`now()`, lastError: null })
    .where(and(eq(outboxEvents.id, id), or(eq(outboxEvents.status, "dead"), eq(outboxEvents.status, "failed"), isNull(outboxEvents.leaseOwner))));
}
