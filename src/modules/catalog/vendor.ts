import { desc, eq } from "drizzle-orm";
import { getDb, withContextTransaction, type Db } from "@/db/client";
import { productRevisions, products } from "@/db/schema";
import { requireUser, requireVendorPermission, vendorContext, type Actor } from "@/modules/identity/actor";

/** A vendor's own proposals with review status and admin feedback. RLS restricts revisions to author_vendor_id. */
export async function listVendorProposals(actor: Actor, vendorId: string, db: Db = getDb()) {
  const user = requireUser(actor);
  const scope = requireVendorPermission(actor, vendorId, "product:propose");
  return withContextTransaction(
    vendorContext(user, scope),
    (tx) =>
      tx
        .select({ revisionId: productRevisions.id, revisionNo: productRevisions.revisionNo, reviewStatus: productRevisions.reviewStatus, reviewReason: productRevisions.reviewReason, submittedAt: productRevisions.submittedAt, productId: products.id, publicCode: products.publicCode, slug: products.slug, lifecycle: products.lifecycle, name: productRevisions.content })
        .from(productRevisions)
        .innerJoin(products, eq(products.id, productRevisions.productId))
        .where(eq(productRevisions.authorVendorId, scope.vendorId))
        .orderBy(desc(productRevisions.createdAt)),
    db,
  );
}
