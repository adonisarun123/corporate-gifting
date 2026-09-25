import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, withContextTransaction, type Db, type Tx } from "@/db/client";
import {
  inventoryBalances,
  inventoryMovements,
  offerPriceTiers,
  productVariants,
  publicPriceEntries,
  vendorOfferRevisions,
  vendorOffers,
} from "@/db/schema";
import {
  platformContext,
  requirePermission,
  requireUser,
  requireVendorPermission,
  vendorContext,
  type Actor,
} from "@/modules/identity/actor";
import { appendAudit } from "@/modules/audit/service";
import { appendOutbox } from "@/modules/outbox/service";
import { businessRule, conflict, notFound } from "@/lib/errors";
import { assertNoTierOverlap, type Tier } from "@/modules/pricing/rules";
import { refreshSupplySummary } from "@/modules/catalog/service";

const tierSchema = z.object({
  minQuantity: z.number().int().positive(),
  maxQuantity: z.number().int().positive().nullable(),
  unitCostMinor: z.number().int().nonnegative(),
});

export const createOfferSchema = z.object({
  vendorId: z.string().uuid(),
  variantId: z.string().uuid(),
  supplierSku: z.string().min(1).max(60),
  moq: z.number().int().positive(),
  quantityIncrement: z.number().int().positive().default(1),
  supplyMode: z.enum(["ready_stock", "made_to_order", "mixed"]).default("ready_stock"),
  leadTimeDaysMin: z.number().int().nonnegative(),
  leadTimeDaysMax: z.number().int().nonnegative(),
  brandingCapabilities: z.array(z.string().max(60)).max(10).default([]),
  tiers: z.array(tierSchema).min(1).max(20),
  setupChargeMinor: z.number().int().nonnegative().default(0),
  setupChargeScope: z.enum(["per_order", "per_design", "per_colour", "per_location"]).default("per_order"),
  activate: z.boolean().default(true),
});
export type CreateOfferInput = z.infer<typeof createOfferSchema>;

/**
 * Vendor creates its offer for a variant with the first cost revision.
 * vendorId is only used to pick the actor's own membership (AC-08).
 */
export async function createOffer(actor: Actor, raw: unknown, db: Db = getDb()) {
  const input = createOfferSchema.parse(raw);
  const user = requireUser(actor);
  const scope = requireVendorPermission(actor, input.vendorId, "offer:write");
  if (input.leadTimeDaysMax < input.leadTimeDaysMin) throw businessRule("Lead time range is inverted", { leadTimeDaysMax: ["must be ≥ min"] });
  assertNoTierOverlap(input.tiers);
  return withContextTransaction(
    vendorContext(user, scope),
    async (tx) => {
      const variant = await tx.query.productVariants.findFirst({ where: eq(productVariants.id, input.variantId) });
      if (!variant) throw notFound("Variant not found");
      const [offer] = await tx
        .insert(vendorOffers)
        .values({
          vendorId: scope.vendorId,
          variantId: variant.id,
          supplierSku: input.supplierSku,
          status: input.activate ? "active" : "draft",
          moq: input.moq,
          quantityIncrement: input.quantityIncrement,
          supplyMode: input.supplyMode,
          leadTimeDaysMin: input.leadTimeDaysMin,
          leadTimeDaysMax: input.leadTimeDaysMax,
          brandingCapabilities: input.brandingCapabilities,
          createdBy: user.userId,
          updatedBy: user.userId,
        })
        .returning();
      if (!offer) throw new Error("offer insert failed");
      const revision = await insertOfferRevision(tx, {
        offerId: offer.id,
        vendorId: scope.vendorId,
        revisionNo: 1,
        tiers: input.tiers,
        setupChargeMinor: input.setupChargeMinor,
        setupChargeScope: input.setupChargeScope,
        authorUserId: user.userId,
      });
      await tx.update(vendorOffers).set({ currentRevisionId: revision.id }).where(eq(vendorOffers.id, offer.id));
      await tx.insert(inventoryBalances).values({ offerId: offer.id, vendorId: scope.vendorId, onHand: 0, observedAt: new Date() });
      await appendAudit(tx, {
        actorKind: "vendor",
        actorId: user.userId,
        vendorScopeId: scope.vendorId,
        action: "supply.offer.created",
        entityType: "vendor_offer",
        entityId: offer.id,
        entityVersion: offer.rowVersion,
        after: { variantId: variant.id, moq: offer.moq, status: offer.status, revisionId: revision.id },
      });
      await appendOutbox(tx, { type: "supply.offer.updated", entityType: "vendor_offer", entityId: offer.id, payload: { productId: variant.productId } });
      await refreshSupplySummary(tx, variant.productId);
      return { offer: { ...offer, currentRevisionId: revision.id }, revision };
    },
    db,
  );
}

async function insertOfferRevision(
  tx: Tx,
  input: { offerId: string; vendorId: string; revisionNo: number; tiers: Tier[]; setupChargeMinor: number; setupChargeScope: string; authorUserId: string; notes?: string },
) {
  const [revision] = await tx
    .insert(vendorOfferRevisions)
    .values({
      offerId: input.offerId,
      vendorId: input.vendorId,
      revisionNo: input.revisionNo,
      setupChargeMinor: input.setupChargeMinor,
      setupChargeScope: input.setupChargeScope,
      authorUserId: input.authorUserId,
      notes: input.notes ?? null,
    })
    .returning();
  if (!revision) throw new Error("offer revision insert failed");
  await tx.insert(offerPriceTiers).values(
    input.tiers.map((t) => ({ offerRevisionId: revision.id, vendorId: input.vendorId, minQuantity: t.minQuantity, maxQuantity: t.maxQuantity, unitCostMinor: t.unitCostMinor })),
  );
  return revision;
}

export const reviseCostSchema = z.object({
  vendorId: z.string().uuid(),
  offerId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  tiers: z.array(tierSchema).min(1).max(20),
  setupChargeMinor: z.number().int().nonnegative().default(0),
  setupChargeScope: z.enum(["per_order", "per_design", "per_colour", "per_location"]).default("per_order"),
  notes: z.string().max(500).optional(),
});

/**
 * Vendor cost change → NEW internal offer revision (AC-09). Public selling price is untouched;
 * an outbox event lets the platform review affected quotes and margins.
 */
export async function reviseOfferCost(actor: Actor, raw: unknown, db: Db = getDb()) {
  const input = reviseCostSchema.parse(raw);
  const user = requireUser(actor);
  const scope = requireVendorPermission(actor, input.vendorId, "offer:write");
  assertNoTierOverlap(input.tiers);
  return withContextTransaction(
    vendorContext(user, scope),
    async (tx) => {
      const offer = await tx.query.vendorOffers.findFirst({ where: and(eq(vendorOffers.id, input.offerId), eq(vendorOffers.vendorId, scope.vendorId)) });
      if (!offer) throw notFound("Offer not found");
      if (offer.rowVersion !== input.expectedVersion) throw conflict("Offer was changed by someone else", { currentVersion: offer.rowVersion });
      const last = await tx.query.vendorOfferRevisions.findFirst({ where: eq(vendorOfferRevisions.offerId, offer.id), orderBy: desc(vendorOfferRevisions.revisionNo) });
      const revision = await insertOfferRevision(tx, {
        offerId: offer.id,
        vendorId: scope.vendorId,
        revisionNo: (last?.revisionNo ?? 0) + 1,
        tiers: input.tiers,
        setupChargeMinor: input.setupChargeMinor,
        setupChargeScope: input.setupChargeScope,
        authorUserId: user.userId,
        notes: input.notes,
      });
      if (last) await tx.update(vendorOfferRevisions).set({ validUntil: new Date() }).where(eq(vendorOfferRevisions.id, last.id));
      const [updated] = await tx
        .update(vendorOffers)
        .set({ currentRevisionId: revision.id, rowVersion: sql`${vendorOffers.rowVersion} + 1`, updatedBy: user.userId })
        .where(and(eq(vendorOffers.id, offer.id), eq(vendorOffers.rowVersion, input.expectedVersion)))
        .returning();
      if (!updated) throw conflict("Offer was changed by someone else");
      await appendAudit(tx, {
        actorKind: "vendor",
        actorId: user.userId,
        vendorScopeId: scope.vendorId,
        action: "supply.offer.cost_revised",
        entityType: "vendor_offer",
        entityId: offer.id,
        entityVersion: updated.rowVersion,
        before: { revisionId: offer.currentRevisionId },
        after: { revisionId: revision.id },
        reason: input.notes ?? null,
      });
      await appendOutbox(tx, { type: "supply.offer.updated", entityType: "vendor_offer", entityId: offer.id, payload: { costChanged: true } });
      return { offer: updated, revision };
    },
    db,
  );
}

export const adjustStockSchema = z.object({
  vendorId: z.string().uuid(),
  offerId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  /** Either an absolute count (reconciliation) or a delta. */
  absoluteOnHand: z.number().int().nonnegative().optional(),
  delta: z.number().int().optional(),
  kind: z.enum(["receipt", "issue", "damage", "return", "reconciliation", "import"]).default("reconciliation"),
  reason: z.string().max(300).optional(),
  observedAt: z.coerce.date().optional(),
});

/**
 * Stock update: immediate after validation, with an append-only movement and optimistic lock (AC-11).
 * An absolute number becomes a reconciliation movement under the row lock, never a silent overwrite.
 */
export async function adjustStock(actor: Actor, raw: unknown, db: Db = getDb()) {
  const input = adjustStockSchema.parse(raw);
  if ((input.absoluteOnHand === undefined) === (input.delta === undefined)) throw businessRule("Provide exactly one of absoluteOnHand or delta");
  const user = requireUser(actor);
  const platformOverride = user.permissions.has("vendors:override_supply");
  const scope = platformOverride ? null : requireVendorPermission(actor, input.vendorId, "inventory:write");
  if (platformOverride && !input.reason) throw businessRule("A reason is required for platform stock overrides", { reason: ["required"] });
  const ctx = scope ? vendorContext(user, scope) : platformContext(user);
  return withContextTransaction(
    ctx,
    async (tx) => {
      const offer = await tx.query.vendorOffers.findFirst({ where: and(eq(vendorOffers.id, input.offerId), eq(vendorOffers.vendorId, input.vendorId)) });
      if (!offer) throw notFound("Offer not found");
      const [balance] = await tx.select().from(inventoryBalances).where(eq(inventoryBalances.offerId, offer.id)).for("update");
      if (!balance) throw notFound("Inventory record not found");
      if (balance.rowVersion !== input.expectedVersion) throw conflict("Stock was updated by someone else; reload to see the latest figure", { currentVersion: balance.rowVersion, currentOnHand: balance.onHand });
      const delta = input.absoluteOnHand !== undefined ? input.absoluteOnHand - balance.onHand : input.delta!;
      const resulting = balance.onHand + delta;
      if (resulting < 0) throw businessRule("Stock cannot go negative", { delta: ["exceeds on-hand"] });
      const [updated] = await tx
        .update(inventoryBalances)
        .set({ onHand: resulting, observedAt: input.observedAt ?? new Date(), rowVersion: sql`${inventoryBalances.rowVersion} + 1` })
        .where(and(eq(inventoryBalances.id, balance.id), eq(inventoryBalances.rowVersion, input.expectedVersion)))
        .returning();
      if (!updated) throw conflict("Stock was updated concurrently");
      await tx.insert(inventoryMovements).values({
        offerId: offer.id,
        vendorId: offer.vendorId,
        kind: input.absoluteOnHand !== undefined ? "reconciliation" : input.kind,
        delta,
        resultingOnHand: resulting,
        reason: input.reason ?? null,
        actorUserId: user.userId,
      });
      await appendAudit(tx, {
        actorKind: scope ? "vendor" : "platform",
        actorId: user.userId,
        vendorScopeId: offer.vendorId,
        action: "supply.stock.adjusted",
        entityType: "inventory_balance",
        entityId: balance.id,
        entityVersion: updated.rowVersion,
        before: { onHand: balance.onHand },
        after: { onHand: resulting, delta },
        reason: input.reason ?? null,
      });
      const variant = await tx.query.productVariants.findFirst({ where: eq(productVariants.id, offer.variantId) });
      await appendOutbox(tx, { type: "supply.stock.updated", entityType: "vendor_offer", entityId: offer.id, payload: { productId: variant?.productId } });
      if (variant) await refreshSupplySummary(tx, variant.productId);
      return updated;
    },
    db,
  );
}

/** Vendor's own offers with current cost tiers and stock. Never returns other vendors' rows (RLS + explicit scope). */
export async function listVendorOffers(actor: Actor, vendorId: string, db: Db = getDb()) {
  const user = requireUser(actor);
  const scope = requireVendorPermission(actor, vendorId, "offer:read");
  return withContextTransaction(
    vendorContext(user, scope),
    async (tx) => {
      const offers = await tx
        .select({
          offer: vendorOffers,
          sku: productVariants.sku,
          variantLabel: productVariants.label,
          productId: productVariants.productId,
          onHand: inventoryBalances.onHand,
          observedAt: inventoryBalances.observedAt,
          stockVersion: inventoryBalances.rowVersion,
        })
        .from(vendorOffers)
        .innerJoin(productVariants, eq(productVariants.id, vendorOffers.variantId))
        .leftJoin(inventoryBalances, eq(inventoryBalances.offerId, vendorOffers.id))
        .where(eq(vendorOffers.vendorId, scope.vendorId))
        .orderBy(desc(vendorOffers.updatedAt));
      const revIds = offers.map((o) => o.offer.currentRevisionId).filter((x): x is string => !!x);
      const tiers = revIds.length
        ? await tx.select().from(offerPriceTiers).where(inArray(offerPriceTiers.offerRevisionId, revIds))
        : [];
      return offers.map((o) => ({ ...o, tiers: tiers.filter((t) => t.offerRevisionId === o.offer.currentRevisionId) }));
    },
    db,
  );
}

/** Platform: read a single offer with private cost (procurement permission). */
export async function getOfferForSourcing(actor: Actor, offerId: string, db: Db = getDb()) {
  const user = requirePermission(actor, "sourcing:read_costs");
  return withContextTransaction(
    platformContext(user),
    async (tx) => {
      const offer = await tx.query.vendorOffers.findFirst({ where: eq(vendorOffers.id, offerId) });
      if (!offer) throw notFound("Offer not found");
      const tiers = offer.currentRevisionId ? await tx.select().from(offerPriceTiers).where(eq(offerPriceTiers.offerRevisionId, offer.currentRevisionId)) : [];
      return { offer, tiers };
    },
    db,
  );
}

/* ---------- Public selling price (admin-owned) ---------- */

export const setPublicPriceSchema = z.object({
  productId: z.string().uuid(),
  mode: z.enum(["from", "indicative", "request_quote"]),
  minQuantity: z.number().int().positive().default(1),
  unitPriceMinor: z.number().int().positive().nullable(),
  includesTax: z.boolean().default(false),
  includesBranding: z.boolean().default(false),
  includesShipping: z.boolean().default(false),
  reason: z.string().max(300).optional(),
});

export async function setPublicPrice(actor: Actor, raw: unknown, db: Db = getDb()) {
  const user = requirePermission(actor, "catalog:set_public_price");
  const input = setPublicPriceSchema.parse(raw);
  if (input.mode !== "request_quote" && !input.unitPriceMinor) throw businessRule("A price is required unless mode is request_quote", { unitPriceMinor: ["required"] });
  return withContextTransaction(
    platformContext(user),
    async (tx) => {
      // Close any current entry at the same quantity band, then add the new one.
      await tx
        .update(publicPriceEntries)
        .set({ effectiveUntil: new Date() })
        .where(and(eq(publicPriceEntries.productId, input.productId), eq(publicPriceEntries.minQuantity, input.minQuantity), sql`${publicPriceEntries.effectiveUntil} is null`));
      const [entry] = await tx
        .insert(publicPriceEntries)
        .values({
          productId: input.productId,
          mode: input.mode,
          minQuantity: input.minQuantity,
          unitPriceMinor: input.mode === "request_quote" ? null : input.unitPriceMinor,
          includesTax: input.includesTax,
          includesBranding: input.includesBranding,
          includesShipping: input.includesShipping,
          createdBy: user.userId,
        })
        .returning();
      if (!entry) throw new Error("price insert failed");
      await appendAudit(tx, {
        actorKind: "platform",
        actorId: user.userId,
        action: "pricing.public_price.set",
        entityType: "product",
        entityId: input.productId,
        after: { mode: entry.mode, minQuantity: entry.minQuantity, unitPriceMinor: entry.unitPriceMinor },
        reason: input.reason ?? null,
      });
      return entry;
    },
    db,
  );
}
