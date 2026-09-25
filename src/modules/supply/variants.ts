import { and, eq, notInArray } from "drizzle-orm";
import { getDb, withContextTransaction, type Db } from "@/db/client";
import { productVariants, products, vendorOffers } from "@/db/schema";
import { requireUser, requireVendorPermission, vendorContext, type Actor } from "@/modules/identity/actor";

/** Variants of products this vendor proposed that do not yet have an offer from this vendor. */
export async function listVariantsForVendorOffers(actor: Actor, vendorId: string, db: Db = getDb()) {
  const user = requireUser(actor);
  const scope = requireVendorPermission(actor, vendorId, "offer:write");
  return withContextTransaction(
    vendorContext(user, scope),
    async (tx) => {
      const existing = await tx.select({ variantId: vendorOffers.variantId }).from(vendorOffers).where(eq(vendorOffers.vendorId, scope.vendorId));
      const ids = existing.map((e) => e.variantId);
      return tx
        .select({ id: productVariants.id, sku: productVariants.sku, label: productVariants.label })
        .from(productVariants)
        .innerJoin(products, eq(products.id, productVariants.productId))
        .where(and(eq(products.proposedByVendorId, scope.vendorId), eq(productVariants.status, "active"), ids.length ? notInArray(productVariants.id, ids) : undefined));
    },
    db,
  );
}
