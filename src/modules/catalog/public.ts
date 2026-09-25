import { and, asc, desc, eq, gte, isNull, lte, or, sql, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb, withContextTransaction, type Db, type Tx } from "@/db/client";
import {
  categories,
  comboComponents,
  comboRevisions,
  productMedia,
  productRevisions,
  productSupplySummaries,
  productTerms,
  productVariants,
  products,
  publicPriceEntries,
  taxonomyTerms,
} from "@/db/schema";
import type { PriceMode, ProductContent } from "@/db/schema/types";
import { visitorContext } from "@/modules/identity/actor";

/* ---------- Public DTOs: explicit allowlists, never a broad join ---------- */

export interface PublicPrice {
  mode: PriceMode;
  unitPriceMinor: number | null;
  qualifyingQuantity: number | null;
  includesTax: boolean;
  includesBranding: boolean;
  includesShipping: boolean;
}

export interface PublicProductCard {
  id: string;
  publicCode: string;
  slug: string;
  kind: "product" | "combo";
  name: string;
  shortSummary: string;
  heroImage: { url: string; alt: string } | null;
  categoryName: string | null;
  recipients: string[];
  occasions: string[];
  price: PublicPrice;
  minMoq: number | null;
  leadTimeDays: [number, number] | null;
  stockState: string;
}

export interface PublicProductDetail extends PublicProductCard {
  content: ProductContent;
  gallery: Array<{ url: string; alt: string }>;
  variants: Array<{ id: string; sku: string; label: string; options: Record<string, unknown> }>;
  components: Array<{ variantId: string; sku: string; label: string; productName: string; productSlug: string; unitsPerKit: number }>;
  assemblyMode: string | null;
  categorySlug: string | null;
}

export const listFiltersSchema = z.object({
  q: z.string().max(120).optional(),
  category: z.string().max(80).optional(),
  recipient: z.string().max(80).optional(),
  occasion: z.string().max(80).optional(),
  kind: z.enum(["product", "combo"]).optional(),
  quantity: z.coerce.number().int().min(1).max(1_000_000).optional(),
  budgetMinMinor: z.coerce.number().int().min(0).optional(),
  budgetMaxMinor: z.coerce.number().int().min(0).optional(),
  includeUnpriced: z.coerce.boolean().default(true),
  sort: z.enum(["relevance", "newest", "price_asc", "price_desc", "lead_time"]).default("relevance"),
  page: z.coerce.number().int().min(1).default(1),
});
export type ListFilters = z.infer<typeof listFiltersSchema>;

export const PAGE_SIZE = 24;

export async function listPublishedProducts(filters: ListFilters, db: Db = getDb()) {
  return withContextTransaction(
    visitorContext("public"),
    async (tx) => {
      const conditions = [eq(products.lifecycle, "published")];
      if (filters.kind) conditions.push(eq(products.kind, filters.kind));
      if (filters.category) {
        const cat = await tx.query.categories.findFirst({ where: eq(categories.slug, filters.category) });
        if (!cat) return { items: [], total: 0, page: filters.page, pageSize: PAGE_SIZE };
        conditions.push(eq(products.primaryCategoryId, cat.id));
      }
      for (const [kind, slug] of [
        ["recipient", filters.recipient],
        ["occasion", filters.occasion],
      ] as const) {
        if (!slug) continue;
        const term = await tx.query.taxonomyTerms.findFirst({ where: and(eq(taxonomyTerms.kind, kind), eq(taxonomyTerms.slug, slug)) });
        if (!term) return { items: [], total: 0, page: filters.page, pageSize: PAGE_SIZE };
        conditions.push(sql`exists (select 1 from product_terms pt where pt.product_id = ${products.id} and pt.term_id = ${term.id})`);
      }
      if (filters.q?.trim()) {
        const q = filters.q.trim();
        conditions.push(
          sql`exists (select 1 from product_search_documents d where d.product_id = ${products.id}
              and (d.document @@ plainto_tsquery('english', ${q}) or d.name % ${q} or d.public_code ilike ${q + "%"}))`,
        );
      }
      if (filters.quantity) {
        // Budget/MOQ filters use the same basis as the card: price qualifying at the requested quantity.
        conditions.push(sql`coalesce((select min_moq from product_supply_summaries s where s.product_id = ${products.id}), 0) <= ${filters.quantity}`);
      }

      const ids = await tx
        .select({ id: products.id, publishedAt: products.publishedAt })
        .from(products)
        .where(and(...conditions))
        .orderBy(desc(products.publishedAt), asc(products.id));

      let cards = await buildCards(tx, ids.map((r) => r.id), filters.quantity ?? null);

      const applyBudget = filters.budgetMinMinor !== undefined || filters.budgetMaxMinor !== undefined;
      if (applyBudget) {
        cards = cards.filter((c) => {
          if (c.price.unitPriceMinor === null) return filters.includeUnpriced;
          if (filters.budgetMinMinor !== undefined && c.price.unitPriceMinor < filters.budgetMinMinor) return false;
          if (filters.budgetMaxMinor !== undefined && c.price.unitPriceMinor > filters.budgetMaxMinor) return false;
          return true;
        });
      }
      cards = sortCards(cards, filters.sort);
      const total = cards.length;
      const start = (filters.page - 1) * PAGE_SIZE;
      return { items: cards.slice(start, start + PAGE_SIZE), total, page: filters.page, pageSize: PAGE_SIZE };
    },
    db,
  );
}

function sortCards(cards: PublicProductCard[], sort: ListFilters["sort"]): PublicProductCard[] {
  const byId = (a: PublicProductCard, b: PublicProductCard) => a.id.localeCompare(b.id);
  switch (sort) {
    case "price_asc":
      // Unknown prices are never ranked as cheapest: they sort last.
      return [...cards].sort((a, b) => (a.price.unitPriceMinor ?? Infinity) - (b.price.unitPriceMinor ?? Infinity) || byId(a, b));
    case "price_desc":
      return [...cards].sort((a, b) => (b.price.unitPriceMinor ?? -1) - (a.price.unitPriceMinor ?? -1) || byId(a, b));
    case "lead_time":
      return [...cards].sort((a, b) => (a.leadTimeDays?.[1] ?? Infinity) - (b.leadTimeDays?.[1] ?? Infinity) || byId(a, b));
    default:
      return cards; // newest published first, id tie-breaker (already ordered)
  }
}

async function buildCards(tx: Tx, ids: string[], quantity: number | null): Promise<PublicProductCard[]> {
  if (ids.length === 0) return [];
  const base = await tx
    .select({
      id: products.id,
      publicCode: products.publicCode,
      slug: products.slug,
      kind: products.kind,
      content: productRevisions.content,
      categoryName: categories.name,
      minMoq: productSupplySummaries.minMoq,
      ltMin: productSupplySummaries.leadTimeDaysMin,
      ltMax: productSupplySummaries.leadTimeDaysMax,
      stockState: productSupplySummaries.stockState,
    })
    .from(products)
    .innerJoin(productRevisions, eq(productRevisions.id, products.currentRevisionId))
    .leftJoin(categories, eq(categories.id, products.primaryCategoryId))
    .leftJoin(productSupplySummaries, eq(productSupplySummaries.productId, products.id))
    .where(inArray(products.id, ids));

  const media = await tx
    .select({ productId: productMedia.productId, url: productMedia.url, alt: productMedia.altText })
    .from(productMedia)
    .where(and(inArray(productMedia.productId, ids), eq(productMedia.approved, true), eq(productMedia.isHero, true)));
  const heroByProduct = new Map(media.map((m) => [m.productId, { url: m.url, alt: m.alt }]));

  const terms = await tx
    .select({ productId: productTerms.productId, kind: taxonomyTerms.kind, name: taxonomyTerms.name })
    .from(productTerms)
    .innerJoin(taxonomyTerms, eq(taxonomyTerms.id, productTerms.termId))
    .where(inArray(productTerms.productId, ids));

  const prices = await tx
    .select()
    .from(publicPriceEntries)
    .where(
      and(
        inArray(publicPriceEntries.productId, ids),
        isNull(publicPriceEntries.variantId),
        lte(publicPriceEntries.effectiveFrom, sql`now()`),
        or(isNull(publicPriceEntries.effectiveUntil), gte(publicPriceEntries.effectiveUntil, sql`now()`)),
      ),
    )
    .orderBy(asc(publicPriceEntries.minQuantity));

  const order = new Map(ids.map((id, i) => [id, i]));
  return base
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    .map((p) => ({
      id: p.id,
      publicCode: p.publicCode,
      slug: p.slug,
      kind: p.kind,
      name: p.content.name,
      shortSummary: p.content.shortSummary,
      heroImage: heroByProduct.get(p.id) ?? null,
      categoryName: p.categoryName ?? null,
      recipients: terms.filter((t) => t.productId === p.id && t.kind === "recipient").map((t) => t.name),
      occasions: terms.filter((t) => t.productId === p.id && t.kind === "occasion").map((t) => t.name),
      price: pickPrice(prices.filter((e) => e.productId === p.id), quantity),
      minMoq: p.minMoq ?? null,
      leadTimeDays: p.ltMin !== null && p.ltMax !== null && p.ltMin !== undefined && p.ltMax !== undefined ? [p.ltMin, p.ltMax] : null,
      stockState: p.stockState ?? "unknown",
    }));
}

/**
 * Price basis rule (spec §6): if the buyer entered a quantity, use the best entry
 * whose qualifying quantity is ≤ that quantity; otherwise the lowest-quantity "from" entry.
 * Never fabricate ₹0; unknown = request_quote.
 */
export function pickPrice(entries: Array<typeof publicPriceEntries.$inferSelect>, quantity: number | null): PublicPrice {
  const priced = entries.filter((e) => e.mode !== "request_quote" && e.unitPriceMinor !== null);
  let chosen: (typeof entries)[number] | undefined;
  if (quantity !== null) {
    const eligible = priced.filter((e) => e.minQuantity <= quantity).sort((a, b) => b.minQuantity - a.minQuantity);
    chosen = eligible[0];
  } else {
    chosen = priced.sort((a, b) => a.minQuantity - b.minQuantity)[0];
  }
  if (!chosen) {
    return { mode: "request_quote", unitPriceMinor: null, qualifyingQuantity: null, includesTax: false, includesBranding: false, includesShipping: false };
  }
  return {
    mode: chosen.mode,
    unitPriceMinor: chosen.unitPriceMinor,
    qualifyingQuantity: chosen.minQuantity,
    includesTax: chosen.includesTax,
    includesBranding: chosen.includesBranding,
    includesShipping: chosen.includesShipping,
  };
}

export async function getPublishedProductBySlug(slug: string, quantity: number | null = null, db: Db = getDb()): Promise<PublicProductDetail | null> {
  return withContextTransaction(
    visitorContext("public"),
    async (tx) => {
      const p = await tx.query.products.findFirst({ where: and(eq(products.slug, slug), eq(products.lifecycle, "published")) });
      if (!p || !p.currentRevisionId) return null;
      const [card] = await buildCards(tx, [p.id], quantity);
      if (!card) return null;
      const rev = await tx.query.productRevisions.findFirst({ where: eq(productRevisions.id, p.currentRevisionId) });
      if (!rev) return null;
      const gallery = await tx
        .select({ url: productMedia.url, alt: productMedia.altText })
        .from(productMedia)
        .where(and(eq(productMedia.productId, p.id), eq(productMedia.approved, true)))
        .orderBy(asc(productMedia.sortOrder));
      const variants = await tx
        .select({ id: productVariants.id, sku: productVariants.sku, label: productVariants.label, options: productVariants.options })
        .from(productVariants)
        .where(and(eq(productVariants.productId, p.id), eq(productVariants.status, "active")))
        .orderBy(asc(productVariants.sortOrder));
      const category = p.primaryCategoryId ? await tx.query.categories.findFirst({ where: eq(categories.id, p.primaryCategoryId) }) : null;

      let components: PublicProductDetail["components"] = [];
      let assemblyMode: string | null = null;
      if (p.kind === "combo") {
        const current = await tx.query.comboRevisions.findFirst({ where: and(eq(comboRevisions.comboProductId, p.id), eq(comboRevisions.isCurrent, true)) });
        if (current) {
          assemblyMode = current.assemblyMode;
          components = await tx
            .select({
              variantId: comboComponents.variantId,
              sku: productVariants.sku,
              label: productVariants.label,
              productName: sql<string>`${productRevisions.content}->>'name'`,
              productSlug: products.slug,
              unitsPerKit: comboComponents.unitsPerKit,
            })
            .from(comboComponents)
            .innerJoin(productVariants, eq(productVariants.id, comboComponents.variantId))
            .innerJoin(products, eq(products.id, productVariants.productId))
            .innerJoin(productRevisions, eq(productRevisions.id, products.currentRevisionId))
            .where(eq(comboComponents.comboRevisionId, current.id))
            .orderBy(asc(comboComponents.sortOrder));
        }
      }
      return {
        ...card,
        content: rev.content,
        gallery,
        variants: variants.map((v) => ({ ...v, options: (v.options ?? {}) as Record<string, unknown> })),
        components,
        assemblyMode,
        categorySlug: category?.slug ?? null,
      };
    },
    db,
  );
}

export async function listTaxonomy(db: Db = getDb()) {
  return withContextTransaction(
    visitorContext("public"),
    async (tx) => ({
      categories: await tx.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name)),
      terms: await tx.select().from(taxonomyTerms).orderBy(asc(taxonomyTerms.kind), asc(taxonomyTerms.sortOrder)),
    }),
    db,
  );
}

/** For sitemaps: published slugs with real modification dates. */
export async function listPublishedSlugs(db: Db = getDb()) {
  return withContextTransaction(
    visitorContext("public"),
    (tx) => tx.select({ slug: products.slug, kind: products.kind, updatedAt: products.updatedAt }).from(products).where(eq(products.lifecycle, "published")),
    db,
  );
}
