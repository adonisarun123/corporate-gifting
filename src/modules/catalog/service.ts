import { and, eq, desc, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, withContextTransaction, type Db, type Tx } from "@/db/client";
import {
  categories,
  productMedia,
  productRevisions,
  productSupplySummaries,
  productTerms,
  productVariants,
  products,
  taxonomyTerms,
  vendorOffers,
  inventoryBalances,
} from "@/db/schema";
import {
  platformContext,
  requirePermission,
  requireVendorPermission,
  vendorContext,
  type Actor,
} from "@/modules/identity/actor";
import { appendAudit } from "@/modules/audit/service";
import { appendOutbox } from "@/modules/outbox/service";
import { allocateReference } from "@/modules/references/service";
import { businessRule, conflict, notFound } from "@/lib/errors";
import { productContentSchema, slugify, variantInputSchema } from "./content";
import { stockState } from "@/modules/pricing/rules";

/* ------------------------------------------------------------------ */
/* Proposals and revisions                                             */
/* ------------------------------------------------------------------ */

export const proposeProductSchema = z.object({
  vendorId: z.string().uuid(),
  content: productContentSchema,
  primaryCategorySlug: z.string().min(1),
  termSlugs: z.array(z.string()).max(20).default([]),
  variants: z.array(variantInputSchema).min(1).max(20),
  media: z.array(z.object({ url: z.string().url(), altText: z.string().min(3).max(200) })).max(10).default([]),
});
export type ProposeProductInput = z.infer<typeof proposeProductSchema>;

/**
 * Vendor manager proposes a new product. Creates a draft product (platform-owned),
 * a SUBMITTED revision authored by the vendor, variants and unapproved media.
 * Nothing becomes public until an admin approves (AC-10).
 */
export async function proposeProduct(actor: Actor, raw: unknown, db: Db = getDb()) {
  const input = proposeProductSchema.parse(raw);
  const scope = requireVendorPermission(actor, input.vendorId, "product:propose");
  const user = actor as Extract<Actor, { kind: "user" }>;
  return withContextTransaction(
    vendorContext(user, scope),
    async (tx) => {
      const category = await tx.query.categories.findFirst({ where: eq(categories.slug, input.primaryCategorySlug) });
      if (!category) throw businessRule("Unknown category", { primaryCategorySlug: ["unknown"] });
      const publicCode = await allocateReference(tx, "product");
      const slug = await uniqueSlug(tx, slugify(input.content.name));
      const [product] = await tx
        .insert(products)
        .values({
          publicCode,
          kind: "product",
          slug,
          lifecycle: "draft",
          primaryCategoryId: category.id,
          proposedByVendorId: scope.vendorId,
          createdBy: user.userId,
        })
        .returning();
      if (!product) throw new Error("product insert failed");

      const [revision] = await tx
        .insert(productRevisions)
        .values({
          productId: product.id,
          revisionNo: 1,
          content: input.content,
          reviewStatus: "submitted",
          authorUserId: user.userId,
          authorVendorId: scope.vendorId,
          submittedAt: new Date(),
        })
        .returning();
      if (!revision) throw new Error("revision insert failed");

      const variants = await tx
        .insert(productVariants)
        .values(
          input.variants.map((v, i) => ({
            productId: product.id,
            sku: `${publicCode}-${v.skuSuffix}`,
            label: v.label,
            options: v.options,
            sortOrder: i,
          })),
        )
        .returning();

      if (input.termSlugs.length) {
        const terms = await tx.query.taxonomyTerms.findMany({ where: inArray(taxonomyTerms.slug, input.termSlugs) });
        if (terms.length) await tx.insert(productTerms).values(terms.map((t) => ({ productId: product.id, termId: t.id })));
      }
      if (input.media.length) {
        await tx.insert(productMedia).values(
          input.media.map((m, i) => ({ productId: product.id, url: m.url, altText: m.altText, sortOrder: i, isHero: i === 0, approved: false, uploadedBy: user.userId })),
        );
      }

      await appendAudit(tx, {
        actorKind: "vendor",
        actorId: user.userId,
        vendorScopeId: scope.vendorId,
        action: "catalog.product.proposed",
        entityType: "product",
        entityId: product.id,
        after: { publicCode, slug, revisionId: revision.id, variantCount: variants.length },
      });
      return { product, revision, variants };
    },
    db,
  );
}

async function uniqueSlug(tx: Tx, base: string): Promise<string> {
  const candidate = base || "gift";
  const existing = await tx.select({ slug: products.slug }).from(products).where(sql`${products.slug} like ${candidate + "%"}`);
  if (!existing.some((e) => e.slug === candidate)) return candidate;
  const taken = new Set(existing.map((e) => e.slug));
  for (let i = 2; i < 1000; i++) {
    const s = `${candidate}-${i}`;
    if (!taken.has(s)) return s;
  }
  throw conflict("Could not allocate a unique slug");
}

export async function listPendingRevisions(actor: Actor, db: Db = getDb()) {
  const user = requirePermission(actor, "catalog:approve");
  return withContextTransaction(
    platformContext(user),
    (tx) =>
      tx
        .select({
          revisionId: productRevisions.id,
          revisionNo: productRevisions.revisionNo,
          productId: products.id,
          publicCode: products.publicCode,
          slug: products.slug,
          lifecycle: products.lifecycle,
          content: productRevisions.content,
          submittedAt: productRevisions.submittedAt,
          authorVendorId: productRevisions.authorVendorId,
        })
        .from(productRevisions)
        .innerJoin(products, eq(products.id, productRevisions.productId))
        .where(eq(productRevisions.reviewStatus, "submitted"))
        .orderBy(productRevisions.submittedAt),
    db,
  );
}

/**
 * Approve and publish a submitted revision. The previously approved revision
 * stays visible until this commits; media flips to approved with the revision.
 */
export async function approveAndPublishRevision(actor: Actor, input: { revisionId: string; reason?: string }, db: Db = getDb()) {
  const user = requirePermission(actor, "catalog:publish");
  return withContextTransaction(
    platformContext(user),
    async (tx) => {
      const revision = await tx.query.productRevisions.findFirst({ where: eq(productRevisions.id, input.revisionId) });
      if (!revision) throw notFound("Revision not found");
      if (revision.reviewStatus !== "submitted") throw conflict(`Revision is ${revision.reviewStatus}, not submitted`);
      const product = await tx.query.products.findFirst({ where: eq(products.id, revision.productId) });
      if (!product) throw notFound("Product not found");

      const now = new Date();
      if (product.currentRevisionId) {
        await tx.update(productRevisions).set({ reviewStatus: "superseded" }).where(eq(productRevisions.id, product.currentRevisionId));
      }
      await tx
        .update(productRevisions)
        .set({ reviewStatus: "approved", reviewerUserId: user.userId, reviewedAt: now, reviewReason: input.reason ?? null, publishedAt: now })
        .where(eq(productRevisions.id, revision.id));
      const [updated] = await tx
        .update(products)
        .set({ lifecycle: "published", currentRevisionId: revision.id, publishedAt: product.publishedAt ?? now, rowVersion: sql`${products.rowVersion} + 1` })
        .where(and(eq(products.id, product.id), eq(products.rowVersion, product.rowVersion)))
        .returning();
      if (!updated) throw conflict("Product changed concurrently; reload and retry");
      await tx.update(productMedia).set({ approved: true }).where(eq(productMedia.productId, product.id));

      await appendAudit(tx, {
        actorKind: "platform",
        actorId: user.userId,
        action: "catalog.revision.approved_published",
        entityType: "product",
        entityId: product.id,
        entityVersion: updated.rowVersion,
        before: { lifecycle: product.lifecycle, currentRevisionId: product.currentRevisionId },
        after: { lifecycle: "published", currentRevisionId: revision.id },
        reason: input.reason ?? null,
      });
      await appendOutbox(tx, { type: "catalog.product.published", entityType: "product", entityId: product.id, payload: { revisionId: revision.id } });
      // Projections are refreshed synchronously here as well so the vertical slice works without a running dispatcher.
      await refreshSupplySummary(tx, product.id);
      await refreshSearchDocument(tx, product.id);
      return updated;
    },
    db,
  );
}

export async function rejectRevision(actor: Actor, input: { revisionId: string; reason: string }, db: Db = getDb()) {
  const user = requirePermission(actor, "catalog:approve");
  if (!input.reason?.trim()) throw businessRule("A rejection reason is required", { reason: ["required"] });
  return withContextTransaction(
    platformContext(user),
    async (tx) => {
      const revision = await tx.query.productRevisions.findFirst({ where: eq(productRevisions.id, input.revisionId) });
      if (!revision) throw notFound("Revision not found");
      if (revision.reviewStatus !== "submitted") throw conflict(`Revision is ${revision.reviewStatus}, not submitted`);
      await tx
        .update(productRevisions)
        .set({ reviewStatus: "rejected", reviewerUserId: user.userId, reviewedAt: new Date(), reviewReason: input.reason })
        .where(eq(productRevisions.id, revision.id));
      await appendAudit(tx, {
        actorKind: "platform",
        actorId: user.userId,
        vendorScopeId: revision.authorVendorId,
        action: "catalog.revision.rejected",
        entityType: "product_revision",
        entityId: revision.id,
        before: { reviewStatus: "submitted" },
        after: { reviewStatus: "rejected" },
        reason: input.reason,
      });
    },
    db,
  );
}

/* ------------------------------------------------------------------ */
/* Projections (run in system/platform context)                        */
/* ------------------------------------------------------------------ */

/** Public-safe supply summary: aggregates active offers; exposes no vendor identity or cost. */
export async function refreshSupplySummary(tx: Tx, productId: string): Promise<void> {
  const rows = await tx
    .select({
      moq: vendorOffers.moq,
      ltMin: vendorOffers.leadTimeDaysMin,
      ltMax: vendorOffers.leadTimeDaysMax,
      supplyMode: vendorOffers.supplyMode,
      observedAt: inventoryBalances.observedAt,
    })
    .from(vendorOffers)
    .innerJoin(productVariants, eq(productVariants.id, vendorOffers.variantId))
    .leftJoin(inventoryBalances, eq(inventoryBalances.offerId, vendorOffers.id))
    .where(and(eq(productVariants.productId, productId), eq(vendorOffers.status, "active")));

  let state: "fresh" | "stale" | "unknown" | "made_to_order" = "unknown";
  const states = rows.map((r) => stockState(r.observedAt ?? null, r.supplyMode));
  if (states.includes("fresh")) state = "fresh";
  else if (states.includes("made_to_order")) state = "made_to_order";
  else if (states.includes("stale")) state = "stale";

  const summary = {
    productId,
    minMoq: rows.length ? Math.min(...rows.map((r) => r.moq)) : null,
    leadTimeDaysMin: rows.length ? Math.min(...rows.map((r) => r.ltMin)) : null,
    leadTimeDaysMax: rows.length ? Math.max(...rows.map((r) => r.ltMax)) : null,
    stockState: state,
    activeOfferCount: rows.length,
  };
  await tx
    .insert(productSupplySummaries)
    .values(summary)
    .onConflictDoUpdate({ target: productSupplySummaries.productId, set: { ...summary, updatedAt: new Date() } });
}

/** Published-content search document (public fields only). */
export async function refreshSearchDocument(tx: Tx, productId: string): Promise<void> {
  const product = await tx.query.products.findFirst({ where: eq(products.id, productId) });
  if (!product || product.lifecycle !== "published" || !product.currentRevisionId) {
    await tx.execute(sql`delete from product_search_documents where product_id = ${productId}`);
    return;
  }
  const rev = await tx.query.productRevisions.findFirst({ where: eq(productRevisions.id, product.currentRevisionId) });
  if (!rev) return;
  const terms = await tx
    .select({ name: taxonomyTerms.name })
    .from(productTerms)
    .innerJoin(taxonomyTerms, eq(taxonomyTerms.id, productTerms.termId))
    .where(eq(productTerms.productId, productId));
  const category = product.primaryCategoryId ? await tx.query.categories.findFirst({ where: eq(categories.id, product.primaryCategoryId) }) : null;
  const c = rev.content;
  const termText = terms.map((t) => t.name).join(" ");
  await tx.execute(sql`
    insert into product_search_documents (product_id, public_code, name, document, updated_at)
    values (
      ${productId}, ${product.publicCode}, ${c.name},
      setweight(to_tsvector('english', ${c.name}), 'A')
      || setweight(to_tsvector('english', ${product.publicCode}), 'A')
      || setweight(to_tsvector('english', ${category?.name ?? ""} || ' ' || ${termText}), 'B')
      || setweight(to_tsvector('english', ${c.shortSummary}), 'B')
      || setweight(to_tsvector('english', ${c.description}), 'C'),
      now())
    on conflict (product_id) do update set
      public_code = excluded.public_code, name = excluded.name, document = excluded.document, updated_at = now()`);
}

/* ------------------------------------------------------------------ */
/* Admin reads                                                          */
/* ------------------------------------------------------------------ */

export async function listAllProducts(actor: Actor, db: Db = getDb()) {
  const user = requirePermission(actor, "catalog:read_private");
  return withContextTransaction(
    platformContext(user),
    (tx) =>
      tx
        .select({
          id: products.id,
          publicCode: products.publicCode,
          slug: products.slug,
          kind: products.kind,
          lifecycle: products.lifecycle,
          updatedAt: products.updatedAt,
          name: sql<string | null>`(select content->>'name' from product_revisions r where r.product_id = ${products.id} order by r.revision_no desc limit 1)`,
        })
        .from(products)
        .orderBy(desc(products.updatedAt)),
    db,
  );
}
