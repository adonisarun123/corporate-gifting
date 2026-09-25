import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, withContextTransaction, type Db, type DbContext, type Tx } from "@/db/client";
import {
  carts,
  comboComponents,
  comboRevisions,
  consentRecords,
  contacts,
  enquiries,
  enquiryHistory,
  enquiryItems,
  enquiryNotes,
  idempotencyKeys,
  productVariants,
  products,
  productRevisions,
} from "@/db/schema";
import type { EnquiryItemSnapshot } from "@/db/schema/types";
import { AppError, businessRule, conflict, forbidden, notFound } from "@/lib/errors";
import { sha256Hex } from "@/lib/auth/signing";
import { loadCartView, type CartOwner } from "@/modules/carts/service";
import { appendAudit } from "@/modules/audit/service";
import { appendOutbox } from "@/modules/outbox/service";
import { allocateReference } from "@/modules/references/service";
import { consumeVerification } from "@/modules/verification/service";
import { buyerContext, platformContext, requirePermission, requireUser, type Actor } from "@/modules/identity/actor";

export const submitEnquirySchema = z.object({
  cartId: z.string().uuid(),
  expectedCartVersion: z.number().int().positive(),
  contactVerificationId: z.string().uuid(),
  contactName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(30).optional(),
  designation: z.string().max(80).optional(),
  companyName: z.string().min(2).max(200),
  occasion: z.string().max(80).optional(),
  recipientCount: z.number().int().min(1).max(1_000_000),
  budget: z
    .object({
      currency: z.literal("INR"),
      perRecipientMinor: z.number().int().positive(),
      includesTax: z.boolean(),
      includesBranding: z.boolean(),
      includesShipping: z.boolean(),
    })
    .nullable()
    .default(null),
  destination: z.object({ country: z.literal("IN"), city: z.string().max(80).optional(), postalCode: z.string().regex(/^\d{6}$/) }),
  requestedDeliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateIsFlexible: z.boolean().default(false),
  brandingNeeds: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
  processingNoticeVersion: z.string().min(1),
  processingAcknowledged: z.literal(true),
  marketingOptIn: z.boolean().default(false),
});
export type SubmitEnquiryInput = z.infer<typeof submitEnquirySchema>;

const IDEMPOTENCY_TTL_MS = 24 * 3_600_000;

/**
 * Submission (spec §9): idempotent per owner + key; validates and freezes line snapshots;
 * writes header, items, history, audit and outbox in ONE transaction; returns the reference.
 * Notification delivery is asynchronous through the outbox and can never roll this back (AC-05).
 */
export async function submitEnquiry(owner: CartOwner, idempotencyKey: string, raw: unknown, db: Db = getDb()) {
  if (!idempotencyKey || idempotencyKey.length > 200) throw businessRule("Idempotency-Key header is required");
  const input = submitEnquirySchema.parse(raw);
  const scope = owner.kind === "user" ? `user:${owner.actor.userId}` : `guest:${owner.tokenHash}`;
  const requestHash = sha256Hex(JSON.stringify(input));
  const ctx: DbContext = owner.kind === "user" ? buyerContext(owner.actor) : { actorKind: "visitor", requestId: owner.requestId };

  return withContextTransaction(
    ctx,
    async (tx) => {
      // 1. Idempotency: same key + same payload → same result; same key + different payload → 409.
      const [claimed] = await tx
        .insert(idempotencyKeys)
        .values({ scope, key: idempotencyKey, requestHash, expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS) })
        .onConflictDoNothing()
        .returning();
      if (!claimed) {
        const [existing] = await tx.select().from(idempotencyKeys).where(and(eq(idempotencyKeys.scope, scope), eq(idempotencyKeys.key, idempotencyKey))).for("update");
        if (!existing) throw conflict("Idempotency key in use");
        if (existing.requestHash !== requestHash) throw new AppError("idempotency_conflict", "This Idempotency-Key was already used with a different payload");
        if (existing.status === "completed" && existing.responseBody) return existing.responseBody as SubmitResult;
        throw conflict("A submission with this key is still in progress; retry shortly");
      }

      // 2. Cart ownership + version.
      const [cart] = await tx
        .select()
        .from(carts)
        .where(and(eq(carts.id, input.cartId), owner.kind === "user" ? eq(carts.ownerUserId, owner.actor.userId) : eq(carts.guestTokenHash, owner.tokenHash)))
        .for("update");
      if (!cart || cart.status !== "active") throw notFound("Cart not found");
      if (cart.rowVersion !== input.expectedCartVersion) throw conflict("Your cart changed; review it before submitting", { currentVersion: cart.rowVersion });
      const view = await loadCartView(tx, cart);
      if (view.items.length === 0) throw businessRule("Your enquiry cart is empty");
      const unavailable = view.items.filter((i) => !i.available);
      if (unavailable.length) throw businessRule("Some items are no longer available; remove them to continue", { items: unavailable.map((i) => i.publicCode) });

      // 3. Verified contact channel.
      await consumeVerification(tx, input.contactVerificationId, input.email);

      // 4. Contact, consent, header, snapshots, history, audit, outbox.
      const [contact] = await tx
        .insert(contacts)
        .values({
          userId: owner.kind === "user" ? owner.actor.userId : null,
          name: input.contactName,
          email: input.email.toLowerCase(),
          phone: input.phone ?? null,
          companyName: input.companyName,
          designation: input.designation ?? null,
          verifiedChannel: "email",
          verifiedAt: new Date(),
        })
        .returning();
      if (!contact) throw new Error("contact insert failed");
      await tx.insert(consentRecords).values([
        { contactId: contact.id, purpose: "enquiry_processing", noticeVersion: input.processingNoticeVersion, granted: "yes" },
        { contactId: contact.id, purpose: "marketing", noticeVersion: input.processingNoticeVersion, granted: input.marketingOptIn ? "yes" : "no" },
      ]);

      const reference = await allocateReference(tx, "enquiry");
      const [enquiry] = await tx
        .insert(enquiries)
        .values({
          reference,
          contactId: contact.id,
          buyerUserId: owner.kind === "user" ? owner.actor.userId : null,
          cartId: cart.id,
          status: "submitted",
          occasion: input.occasion ?? null,
          recipientCount: input.recipientCount,
          budget: input.budget,
          destination: input.destination,
          requestedDeliveryDate: input.requestedDeliveryDate ?? null,
          dateIsFlexible: input.dateIsFlexible,
          brandingNeeds: input.brandingNeeds ?? null,
          notes: input.notes ?? null,
          processingNoticeVersion: input.processingNoticeVersion,
          marketingOptIn: input.marketingOptIn,
        })
        .returning();
      if (!enquiry) throw new Error("enquiry insert failed");

      const snapshots = await Promise.all(view.items.map((i) => buildSnapshot(tx, i)));
      await tx.insert(enquiryItems).values(
        snapshots.map((s, idx) => ({ enquiryId: enquiry.id, lineNo: idx + 1, productId: s.productId, variantId: s.variantId, quantity: s.quantity, unit: s.unit, snapshot: s })),
      );
      await tx.insert(enquiryHistory).values({ enquiryId: enquiry.id, fromStatus: null, toStatus: "submitted", actorUserId: owner.kind === "user" ? owner.actor.userId : null, reason: "Submitted by customer" });
      await appendAudit(tx, {
        actorKind: owner.kind === "user" ? "buyer" : "visitor",
        actorId: owner.kind === "user" ? owner.actor.userId : null,
        customerScopeId: contact.id,
        action: "enquiry.created",
        entityType: "enquiry",
        entityId: enquiry.id,
        after: { reference, lineCount: snapshots.length, recipientCount: input.recipientCount },
      });
      await appendOutbox(tx, { type: "enquiry.submitted", entityType: "enquiry", entityId: enquiry.id, payload: { reference, contactId: contact.id } });
      await tx.update(carts).set({ status: "submitted" }).where(eq(carts.id, cart.id));

      const result: SubmitResult = {
        enquiryId: enquiry.id,
        reference,
        submittedAt: enquiry.submittedAt.toISOString(),
        lines: snapshots.map((s) => ({ publicCode: s.publicCode, name: s.name, quantity: s.quantity, unit: s.unit })),
      };
      await tx.update(idempotencyKeys).set({ status: "completed", responseCode: 201, responseBody: result }).where(eq(idempotencyKeys.id, claimed.id));
      return result;
    },
    db,
  );
}

export interface SubmitResult {
  enquiryId: string;
  reference: string;
  submittedAt: string;
  lines: Array<{ publicCode: string; name: string; quantity: number; unit: string }>;
  [key: string]: unknown;
}

async function buildSnapshot(tx: Tx, item: Awaited<ReturnType<typeof loadCartView>>["items"][number]): Promise<EnquiryItemSnapshot> {
  const product = await tx.query.products.findFirst({ where: eq(products.id, item.productId) });
  const variant = item.variantId ? await tx.query.productVariants.findFirst({ where: eq(productVariants.id, item.variantId) }) : null;
  let components: EnquiryItemSnapshot["components"];
  if (product?.kind === "combo") {
    const current = await tx.query.comboRevisions.findFirst({ where: and(eq(comboRevisions.comboProductId, product.id), eq(comboRevisions.isCurrent, true)) });
    if (current) {
      const rows = await tx
        .select({ variantId: comboComponents.variantId, sku: productVariants.sku, label: productVariants.label, unitsPerKit: comboComponents.unitsPerKit })
        .from(comboComponents)
        .innerJoin(productVariants, eq(productVariants.id, comboComponents.variantId))
        .where(eq(comboComponents.comboRevisionId, current.id));
      components = rows;
    }
  }
  return {
    productId: item.productId,
    productRevisionId: product?.currentRevisionId ?? null,
    publicCode: item.publicCode,
    name: item.name,
    kind: item.kind,
    variantId: item.variantId,
    variantLabel: variant?.label ?? null,
    variantSku: variant?.sku ?? null,
    quantity: item.quantity,
    unit: item.unit as "item" | "kit",
    configuration: item.configuration,
    estimate: item.estimate,
    ...(components ? { components } : {}),
    capturedAt: new Date().toISOString(),
  };
}

/* ---------- State machine (spec §10) ---------- */

type Status = typeof enquiries.$inferSelect.status;
const TRANSITIONS: Record<Status, Status[]> = {
  submitted: ["qualified", "closed"],
  qualified: ["sourcing", "closed"],
  sourcing: ["quoted", "closed"],
  quoted: ["sourcing", "accepted", "closed"],
  accepted: ["order_confirmed", "sourcing"],
  order_confirmed: [],
  closed: ["qualified"],
};

export function canTransition(from: Status, to: Status): boolean {
  return TRANSITIONS[from].includes(to);
}

export async function transitionEnquiry(
  actor: Actor,
  input: { enquiryId: string; to: Status; reason?: string; closedReason?: typeof enquiries.$inferSelect.closedReason },
  db: Db = getDb(),
) {
  const user = requirePermission(actor, "enquiries:manage");
  return withContextTransaction(platformContext(user), (tx) => transitionEnquiryTx(tx, user.userId, input), db);
}

export async function transitionEnquiryTx(
  tx: Tx,
  actorUserId: string | null,
  input: { enquiryId: string; to: Status; reason?: string; closedReason?: typeof enquiries.$inferSelect.closedReason },
) {
  const [e] = await tx.select().from(enquiries).where(eq(enquiries.id, input.enquiryId)).for("update");
  if (!e) throw notFound("Enquiry not found");
  if (!canTransition(e.status, input.to)) throw conflict(`Cannot move an enquiry from ${e.status} to ${input.to}`);
  if (input.to === "closed" && !input.closedReason) throw businessRule("A closed reason is required", { closedReason: ["required"] });
  if (e.status === "closed" && input.to === "qualified" && !input.reason) throw businessRule("Reopening requires a reason", { reason: ["required"] });
  const [updated] = await tx
    .update(enquiries)
    .set({ status: input.to, closedReason: input.to === "closed" ? input.closedReason : null, rowVersion: sql`${enquiries.rowVersion} + 1` })
    .where(eq(enquiries.id, e.id))
    .returning();
  await tx.insert(enquiryHistory).values({ enquiryId: e.id, fromStatus: e.status, toStatus: input.to, reason: input.reason ?? null, actorUserId });
  await appendAudit(tx, {
    actorKind: actorUserId ? "platform" : "system",
    actorId: actorUserId,
    action: "enquiry.status.changed",
    entityType: "enquiry",
    entityId: e.id,
    entityVersion: updated?.rowVersion ?? null,
    before: { status: e.status },
    after: { status: input.to, closedReason: input.closedReason ?? null },
    reason: input.reason ?? null,
  });
  await appendOutbox(tx, { type: "enquiry.status_changed", entityType: "enquiry", entityId: e.id, payload: { from: e.status, to: input.to } });
  return updated;
}

/* ---------- Reads ---------- */

export async function listEnquiriesForPlatform(actor: Actor, db: Db = getDb()) {
  const user = requireUser(actor);
  const all = user.permissions.has("enquiries:read_all");
  if (!all && !user.permissions.has("enquiries:read_assigned")) throw forbidden();
  return withContextTransaction(
    platformContext(user),
    (tx) =>
      tx
        .select({
          id: enquiries.id,
          reference: enquiries.reference,
          status: enquiries.status,
          recipientCount: enquiries.recipientCount,
          companyName: contacts.companyName,
          contactName: contacts.name,
          submittedAt: enquiries.submittedAt,
          ownerUserId: enquiries.ownerUserId,
          requestedDeliveryDate: enquiries.requestedDeliveryDate,
        })
        .from(enquiries)
        .innerJoin(contacts, eq(contacts.id, enquiries.contactId))
        .where(all ? sql`true` : eq(enquiries.ownerUserId, user.userId))
        .orderBy(desc(enquiries.submittedAt)),
    db,
  );
}

export async function getEnquiryForPlatform(actor: Actor, enquiryId: string, db: Db = getDb()) {
  const user = requireUser(actor);
  if (!user.permissions.has("enquiries:read_all") && !user.permissions.has("enquiries:read_assigned")) throw forbidden();
  return withContextTransaction(
    platformContext(user),
    async (tx) => {
      const e = await tx.query.enquiries.findFirst({ where: eq(enquiries.id, enquiryId) });
      if (!e) throw notFound("Enquiry not found");
      if (!user.permissions.has("enquiries:read_all") && e.ownerUserId !== user.userId) throw notFound("Enquiry not found");
      const contact = await tx.query.contacts.findFirst({ where: eq(contacts.id, e.contactId) });
      const items = await tx.select().from(enquiryItems).where(eq(enquiryItems.enquiryId, e.id)).orderBy(enquiryItems.lineNo);
      const history = await tx.select().from(enquiryHistory).where(eq(enquiryHistory.enquiryId, e.id)).orderBy(enquiryHistory.createdAt);
      const notes = await tx.select().from(enquiryNotes).where(eq(enquiryNotes.enquiryId, e.id)).orderBy(enquiryNotes.createdAt);
      // Current published state for AC-06 comparison (snapshot vs now).
      const current = await Promise.all(
        items.map(async (i) => {
          const p = await tx.query.products.findFirst({ where: eq(products.id, i.productId) });
          const rev = p?.currentRevisionId ? await tx.query.productRevisions.findFirst({ where: eq(productRevisions.id, p.currentRevisionId) }) : null;
          return { itemId: i.id, lifecycle: p?.lifecycle ?? "archived", currentRevisionId: p?.currentRevisionId ?? null, currentName: rev?.content.name ?? null };
        }),
      );
      return { enquiry: e, contact, items, history, notes, current };
    },
    db,
  );
}

export async function addEnquiryNote(actor: Actor, input: { enquiryId: string; body: string; visibility?: "internal" | "customer" }, db: Db = getDb()) {
  const user = requirePermission(actor, "enquiries:manage");
  return withContextTransaction(
    platformContext(user),
    async (tx) => {
      const [note] = await tx.insert(enquiryNotes).values({ enquiryId: input.enquiryId, body: input.body, visibility: input.visibility ?? "internal", authorUserId: user.userId }).returning();
      await appendAudit(tx, { actorKind: "platform", actorId: user.userId, action: "enquiry.note.added", entityType: "enquiry", entityId: input.enquiryId, after: { visibility: note?.visibility } });
      return note;
    },
    db,
  );
}

/** Buyer-side read: only the buyer's own enquiries (by user id). */
export async function listMyEnquiries(actor: Actor, db: Db = getDb()) {
  const user = requireUser(actor);
  return withContextTransaction(
    buyerContext(user),
    (tx) =>
      tx
        .select({ id: enquiries.id, reference: enquiries.reference, status: enquiries.status, submittedAt: enquiries.submittedAt, recipientCount: enquiries.recipientCount })
        .from(enquiries)
        .where(eq(enquiries.buyerUserId, user.userId))
        .orderBy(desc(enquiries.submittedAt)),
    db,
  );
}
