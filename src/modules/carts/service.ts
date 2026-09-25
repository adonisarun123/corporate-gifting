import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, withContextTransaction, type Db, type DbContext, type Tx } from "@/db/client";
import { cartItems, carts, productVariants, products, publicPriceEntries } from "@/db/schema";
import type { CartConfiguration, EstimateSnapshot } from "@/db/schema/types";
import { businessRule, conflict, notFound } from "@/lib/errors";
import { pickPrice } from "@/modules/catalog/public";
import { buyerContext, type Actor, type AuthenticatedActor } from "@/modules/identity/actor";

/** Cart ownership: a guest token hash (cookie) or an authenticated buyer. Never both from the client. */
export type CartOwner = { kind: "guest"; tokenHash: string; requestId: string } | { kind: "user"; actor: AuthenticatedActor };

const GUEST_TTL_DAYS = 30;

const configurationSchema = z.object({
  branding: z.object({ method: z.string().max(60), placement: z.string().max(120).optional(), colours: z.number().int().min(1).max(12).optional(), artworkRef: z.string().max(200).optional() }).optional(),
  instructions: z.string().max(1000).optional(),
  requiredBy: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  destinationPostalCode: z.string().max(12).optional(),
});

export const addItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().default(null),
  quantity: z.number().int().min(1).max(1_000_000),
  configuration: configurationSchema.default({}),
});

export const updateItemSchema = z.object({
  quantity: z.number().int().min(1).max(1_000_000).optional(),
  configuration: configurationSchema.optional(),
  expectedVersion: z.number().int().positive(),
});

function ctxFor(owner: CartOwner): DbContext {
  return owner.kind === "user" ? buyerContext(owner.actor) : { actorKind: "visitor", requestId: owner.requestId };
}

function ownerWhere(owner: CartOwner) {
  return owner.kind === "user" ? eq(carts.ownerUserId, owner.actor.userId) : eq(carts.guestTokenHash, owner.tokenHash);
}

export async function getOrCreateCart(owner: CartOwner, db: Db = getDb()) {
  return withContextTransaction(
    ctxFor(owner),
    async (tx) => {
      const existing = await tx.query.carts.findFirst({ where: and(ownerWhere(owner), eq(carts.status, "active")) });
      if (existing) return existing;
      const [created] = await tx
        .insert(carts)
        .values({
          ownerUserId: owner.kind === "user" ? owner.actor.userId : null,
          guestTokenHash: owner.kind === "guest" ? owner.tokenHash : null,
          expiresAt: owner.kind === "guest" ? new Date(Date.now() + GUEST_TTL_DAYS * 86_400_000) : null,
        })
        .returning();
      if (!created) throw new Error("cart insert failed");
      return created;
    },
    db,
  );
}

export interface CartView {
  id: string;
  rowVersion: number;
  items: Array<{
    id: string;
    rowVersion: number;
    productId: string;
    publicCode: string;
    name: string;
    slug: string;
    kind: "product" | "combo";
    variantId: string | null;
    variantLabel: string | null;
    quantity: number;
    unit: string;
    configuration: CartConfiguration;
    estimate: EstimateSnapshot | null;
    lineEstimateMinor: number | null;
    available: boolean;
  }>;
  knownSubtotalMinor: number;
  hasUnknownCharges: boolean;
}

export async function getCartView(owner: CartOwner, db: Db = getDb()): Promise<CartView | null> {
  return withContextTransaction(
    ctxFor(owner),
    async (tx) => {
      const cart = await tx.query.carts.findFirst({ where: and(ownerWhere(owner), eq(carts.status, "active")) });
      if (!cart) return null;
      return loadCartView(tx, cart);
    },
    db,
  );
}

export async function loadCartView(tx: Tx, cart: typeof carts.$inferSelect): Promise<CartView> {
  const rows = await tx
    .select({
      item: cartItems,
      publicCode: products.publicCode,
      slug: products.slug,
      kind: products.kind,
      lifecycle: products.lifecycle,
      name: sql<string>`(select r.content->>'name' from product_revisions r where r.id = ${products.currentRevisionId})`,
      variantLabel: productVariants.label,
    })
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .leftJoin(productVariants, eq(productVariants.id, cartItems.variantId))
    .where(eq(cartItems.cartId, cart.id))
    .orderBy(asc(cartItems.createdAt));

  let knownSubtotal = 0;
  let hasUnknown = false;
  const items = rows.map((r) => {
    const est = r.item.estimate ?? null;
    const line = est?.unitPriceMinor != null ? est.unitPriceMinor * r.item.quantity : null;
    if (line === null) hasUnknown = true;
    else knownSubtotal += line;
    return {
      id: r.item.id,
      rowVersion: r.item.rowVersion,
      productId: r.item.productId,
      publicCode: r.publicCode,
      name: r.name ?? "(unpublished product)",
      slug: r.slug,
      kind: r.kind,
      variantId: r.item.variantId,
      variantLabel: r.variantLabel ?? null,
      quantity: r.item.quantity,
      unit: r.item.unit,
      configuration: r.item.configuration,
      estimate: est,
      lineEstimateMinor: line,
      available: r.lifecycle === "published",
    };
  });
  return { id: cart.id, rowVersion: cart.rowVersion, items, knownSubtotalMinor: knownSubtotal, hasUnknownCharges: hasUnknown };
}

/** Server-side estimate at the line quantity. Never trusts a submitted price. */
async function estimateFor(tx: Tx, productId: string, quantity: number): Promise<EstimateSnapshot> {
  const entries = await tx
    .select()
    .from(publicPriceEntries)
    .where(and(eq(publicPriceEntries.productId, productId), sql`${publicPriceEntries.variantId} is null`, sql`${publicPriceEntries.effectiveUntil} is null or ${publicPriceEntries.effectiveUntil} >= now()`));
  const p = pickPrice(entries, quantity);
  return {
    mode: p.mode,
    unitPriceMinor: p.unitPriceMinor,
    currency: "INR",
    qualifyingQuantity: p.qualifyingQuantity,
    includesTax: p.includesTax,
    includesBranding: p.includesBranding,
    includesShipping: p.includesShipping,
    calculatedAt: new Date().toISOString(),
  };
}

function sameConfiguration(a: CartConfiguration, b: CartConfiguration): boolean {
  return JSON.stringify(normalise(a)) === JSON.stringify(normalise(b));
}
function normalise(c: CartConfiguration) {
  return { branding: c.branding ?? null, instructions: c.instructions ?? "", requiredBy: c.requiredBy ?? null, destinationPostalCode: c.destinationPostalCode ?? null };
}

/** Add a line. Merges only when product, variant and configuration all match (spec §9). */
export async function addItem(owner: CartOwner, raw: unknown, db: Db = getDb()) {
  const input = addItemSchema.parse(raw);
  return withContextTransaction(
    ctxFor(owner),
    async (tx) => {
      const cart = await lockActiveCart(tx, owner);
      const product = await tx.query.products.findFirst({ where: and(eq(products.id, input.productId), eq(products.lifecycle, "published")) });
      if (!product) throw notFound("Product is not available");
      if (input.variantId) {
        const v = await tx.query.productVariants.findFirst({ where: and(eq(productVariants.id, input.variantId), eq(productVariants.productId, product.id), eq(productVariants.status, "active")) });
        if (!v) throw businessRule("Variant is not available", { variantId: ["invalid"] });
      }
      const unit = product.kind === "combo" ? "kit" : "item";
      const existing = await tx.query.cartItems.findMany({ where: and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, product.id)) });
      const mergeTarget = existing.find((e) => e.variantId === input.variantId && sameConfiguration(e.configuration, input.configuration));
      if (mergeTarget) {
        const qty = mergeTarget.quantity + input.quantity;
        const [row] = await tx
          .update(cartItems)
          .set({ quantity: qty, estimate: await estimateFor(tx, product.id, qty), rowVersion: sql`${cartItems.rowVersion} + 1` })
          .where(eq(cartItems.id, mergeTarget.id))
          .returning();
        await bumpCart(tx, cart.id);
        return row;
      }
      const [row] = await tx
        .insert(cartItems)
        .values({ cartId: cart.id, productId: product.id, variantId: input.variantId, quantity: input.quantity, unit, configuration: input.configuration, estimate: await estimateFor(tx, product.id, input.quantity) })
        .returning();
      await bumpCart(tx, cart.id);
      return row;
    },
    db,
  );
}

export async function updateItem(owner: CartOwner, itemId: string, raw: unknown, db: Db = getDb()) {
  const input = updateItemSchema.parse(raw);
  return withContextTransaction(
    ctxFor(owner),
    async (tx) => {
      const cart = await lockActiveCart(tx, owner);
      const item = await tx.query.cartItems.findFirst({ where: and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)) });
      if (!item) throw notFound("Cart line not found");
      if (item.rowVersion !== input.expectedVersion) throw conflict("Cart line changed in another tab", { currentVersion: item.rowVersion });
      const quantity = input.quantity ?? item.quantity;
      const [row] = await tx
        .update(cartItems)
        .set({ quantity, configuration: input.configuration ?? item.configuration, estimate: await estimateFor(tx, item.productId, quantity), rowVersion: sql`${cartItems.rowVersion} + 1` })
        .where(and(eq(cartItems.id, item.id), eq(cartItems.rowVersion, input.expectedVersion)))
        .returning();
      if (!row) throw conflict("Cart line changed concurrently");
      await bumpCart(tx, cart.id);
      return row;
    },
    db,
  );
}

export async function removeItem(owner: CartOwner, itemId: string, db: Db = getDb()) {
  return withContextTransaction(
    ctxFor(owner),
    async (tx) => {
      const cart = await lockActiveCart(tx, owner);
      await tx.delete(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)));
      await bumpCart(tx, cart.id);
    },
    db,
  );
}

async function lockActiveCart(tx: Tx, owner: CartOwner) {
  const [cart] = await tx.select().from(carts).where(and(ownerWhere(owner), eq(carts.status, "active"))).for("update");
  if (cart) return cart;
  const [created] = await tx
    .insert(carts)
    .values({
      ownerUserId: owner.kind === "user" ? owner.actor.userId : null,
      guestTokenHash: owner.kind === "guest" ? owner.tokenHash : null,
      expiresAt: owner.kind === "guest" ? new Date(Date.now() + GUEST_TTL_DAYS * 86_400_000) : null,
    })
    .returning();
  if (!created) throw new Error("cart insert failed");
  return created;
}

async function bumpCart(tx: Tx, cartId: string) {
  await tx.update(carts).set({ rowVersion: sql`${carts.rowVersion} + 1` }).where(eq(carts.id, cartId));
}

/** On sign-in: merge the guest cart into the buyer's cart. Conflicting lines are kept separate for the buyer to resolve. */
export async function mergeGuestCartIntoUser(actor: Actor, guestTokenHash: string, db: Db = getDb()) {
  if (actor.kind !== "user") return;
  return withContextTransaction(
    buyerContext(actor),
    async (tx) => {
      const guest = await tx.query.carts.findFirst({ where: and(eq(carts.guestTokenHash, guestTokenHash), eq(carts.status, "active")) });
      if (!guest) return;
      const target = await lockActiveCart(tx, { kind: "user", actor });
      await tx.update(cartItems).set({ cartId: target.id }).where(eq(cartItems.cartId, guest.id));
      await tx.update(carts).set({ status: "merged" }).where(eq(carts.id, guest.id));
      await bumpCart(tx, target.id);
    },
    db,
  );
}
