import { asc, eq } from "drizzle-orm";
import { getDb, withContextTransaction, type Db } from "@/db/client";
import { productMedia, productRevisions, products, vendors } from "@/db/schema";
import type { ProductContent } from "@/db/schema/types";
import { platformContext, requirePermission, type Actor } from "@/modules/identity/actor";

/** Before/after field view for the approval inbox (spec §12), plus automated quality checks. */
export async function getRevisionDiff(actor: Actor, revisionId: string, db: Db = getDb()) {
  const user = requirePermission(actor, "catalog:approve");
  return withContextTransaction(
    platformContext(user),
    async (tx) => {
      const proposed = await tx.query.productRevisions.findFirst({ where: eq(productRevisions.id, revisionId) });
      if (!proposed) return null;
      const product = await tx.query.products.findFirst({ where: eq(products.id, proposed.productId) });
      if (!product) return null;
      const current = product.currentRevisionId ? await tx.query.productRevisions.findFirst({ where: eq(productRevisions.id, product.currentRevisionId) }) : null;
      const media = await tx.select().from(productMedia).where(eq(productMedia.productId, product.id)).orderBy(asc(productMedia.sortOrder));
      const vendor = proposed.authorVendorId ? await tx.query.vendors.findFirst({ where: eq(vendors.id, proposed.authorVendorId) }) : null;
      const render = (c: ProductContent | undefined) => ({
        Name: c?.name, Summary: c?.shortSummary, Description: c?.description, "Key benefits": c?.keyBenefits.join("\n"), "Who is it for": c?.recipientSuitability,
        Specifications: c?.specifications.map((s) => `${s.name}: ${s.value}${s.unit ? " " + s.unit : ""}`).join("\n"), Branding: c?.brandingMethods.join(", ") || (c ? "none" : undefined),
        Limitations: c?.limitations, Care: c?.careInstructions, FAQs: c?.faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n"),
      });
      const before = render(current?.content);
      const after = render(proposed.content);
      const fields = (Object.keys(after) as Array<keyof typeof after>).map((name) => ({ name, before: before[name] ?? null, after: after[name] ?? "", changed: (before[name] ?? "") !== (after[name] ?? "") }));
      const checks: string[] = [];
      if (media.length === 0) checks.push("No product image attached.");
      if (!proposed.content.specifications.length) checks.push("No specifications provided.");
      if (/\b(eco[- ]?friendly|food[- ]?safe|BIS certified|premium brand original)\b/i.test((after.Description ?? "") + (after.Summary ?? ""))) checks.push("Contains claim wording that needs evidence.");
      if (proposed.content.description.length < 120) checks.push("Description is short (<120 characters).");
      return { product, proposed, current, media, fields, checks, authorVendorCode: vendor?.vendorCode ?? null };
    },
    db,
  );
}
