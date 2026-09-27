/**
 * DEMO catalogue seed: ~40 products across three synthetic vendors plus five fixed kits, all published,
 * priced and stocked through the same services the UI uses (audit, references, projections exercised).
 *
 * Safety: refuses when APP_ENV=production or NODE_ENV=production; refuses non-local databases unless
 * `--allow-remote` is passed explicitly. Idempotent: skips any product whose slug already exists.
 * Run after `scripts/seed.ts` (needs the admin user, categories and taxonomy terms).
 *
 *   npm run db:seed:demo            # local
 *   npm run db:seed:demo -- --allow-remote   # preview database (never production)
 */
import "dotenv/config";
import { config } from "dotenv";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, getPool, withContextTransaction } from "@/db/client";
import * as schema from "@/db/schema";
import { systemContext } from "@/modules/identity/actor";
import { resolveActorByUserId } from "@/modules/identity/service";
import { createVendor } from "@/modules/vendors/service";
import { approveAndPublishRevision, listPendingRevisions, proposeProduct, refreshSearchDocument, refreshSupplySummary } from "@/modules/catalog/service";
import { adjustStock, createOffer, setPublicPrice } from "@/modules/supply/service";
import { allocateReference } from "@/modules/references/service";
import { slugify } from "@/modules/catalog/content";
import { DEMO_KITS, DEMO_PRODUCTS, U, type DemoVendorKey } from "./demo-catalogue";

config({ path: ".env.local" });

const VENDORS: Record<DemoVendorKey, { legalName: string; displayName: string; email: string; managerEmail: string; managerName: string; categories: string[]; regions: string[] }> = {
  alpha: { legalName: "Alpha Supplies Private Limited", displayName: "Alpha Supplies", email: "ops@alpha.local", managerEmail: "manager@alpha.local", managerName: "Alpha Manager", categories: ["drinkware", "stationery", "desk-accessories", "home-and-lifestyle"], regions: ["KA", "TN", "MH"] },
  beta: { legalName: "Beta Traders LLP", displayName: "Beta Traders", email: "ops@beta.local", managerEmail: "manager@beta.local", managerName: "Beta Manager", categories: ["drinkware", "bags", "technology-accessories"], regions: ["KA", "DL", "MH"] },
  gamma: { legalName: "Gamma Merch and Gourmet Private Limited", displayName: "Gamma Merch", email: "ops@gamma.local", managerEmail: "manager@gamma.local", managerName: "Gamma Manager", categories: ["apparel", "food-hampers", "wellness", "stationery"], regions: ["KA", "MH", "DL", "TS"] },
};

const R = (rupees: number) => Math.round(rupees * 100);

async function main() {
  if (process.env.NODE_ENV === "production" || process.env.APP_ENV === "production") throw new Error("seed-demo refuses to run in production");
  const url = process.env.DATABASE_URL ?? "";
  if (!/localhost|127\.0\.0\.1/.test(url) && !process.argv.includes("--allow-remote")) {
    throw new Error("DATABASE_URL is not local. Re-run with --allow-remote to seed a preview database (never production).");
  }
  const db = getDb();

  // Admin actor (from scripts/seed.ts).
  const adminRow = await withContextTransaction(systemContext(), (tx) => tx.query.users.findFirst({ where: eq(schema.users.email, "admin@cgh.local") }), db);
  if (!adminRow) throw new Error("Run scripts/seed.ts first (admin@cgh.local missing)");
  const admin = (await resolveActorByUserId(adminRow.id, "seed-demo", db))!;

  // Vendors + one manager each (created if missing).
  const vendorIds: Record<DemoVendorKey, string> = { alpha: "", beta: "", gamma: "" };
  const managers: Record<DemoVendorKey, Awaited<ReturnType<typeof resolveActorByUserId>>> = { alpha: null, beta: null, gamma: null };
  for (const key of Object.keys(VENDORS) as DemoVendorKey[]) {
    const v = VENDORS[key];
    let vendor = await withContextTransaction(systemContext(), (tx) => tx.query.vendors.findFirst({ where: eq(schema.vendors.legalName, v.legalName) }), db);
    if (!vendor) {
      vendor = await createVendor(admin, { legalName: v.legalName, displayName: v.displayName, contactEmail: v.email, serviceCategories: v.categories, serviceableRegions: v.regions }, db);
      console.log(`vendor created: ${v.displayName}`);
    }
    vendorIds[key] = vendor.id;
    const userId = await withContextTransaction(systemContext(), async (tx) => {
      let u = await tx.query.users.findFirst({ where: eq(schema.users.email, v.managerEmail) });
      if (!u) u = (await tx.insert(schema.users).values({ authSubject: `dev:${v.managerEmail}`, email: v.managerEmail, displayName: v.managerName, status: "active" }).returning())[0]!;
      const m = await tx.query.vendorMemberships.findFirst({ where: and(eq(schema.vendorMemberships.vendorId, vendor!.id), eq(schema.vendorMemberships.userId, u.id)) });
      if (!m) await tx.insert(schema.vendorMemberships).values({ vendorId: vendor!.id, userId: u.id, role: "owner", status: "active" });
      return u.id;
    }, db);
    managers[key] = await resolveActorByUserId(userId, "seed-demo", db);
  }

  const existingSlugs = new Set((await withContextTransaction(systemContext(), (tx) => tx.select({ slug: schema.products.slug }).from(schema.products), db)).map((r) => r.slug));

  // Products.
  const created: Record<string, { productId: string; variantIds: string[] }> = {};
  for (const p of DEMO_PRODUCTS) {
    const slug = slugify(p.name);
    if (existingSlugs.has(slug)) {
      const row = await withContextTransaction(systemContext(), async (tx) => {
        const prod = await tx.query.products.findFirst({ where: eq(schema.products.slug, slug) });
        const vars = prod ? await tx.select({ id: schema.productVariants.id }).from(schema.productVariants).where(eq(schema.productVariants.productId, prod.id)).orderBy(schema.productVariants.sortOrder) : [];
        return prod ? { productId: prod.id, variantIds: vars.map((v) => v.id) } : null;
      }, db);
      if (row) created[p.key] = row;
      console.log(`skip (exists): ${p.name}`);
      continue;
    }
    const mgr = managers[p.vendor]!;
    const res = await proposeProduct(mgr, {
      vendorId: vendorIds[p.vendor], primaryCategorySlug: p.category, termSlugs: p.terms,
      content: { name: p.name, shortSummary: p.summary, description: p.description, keyBenefits: p.benefits, recipientSuitability: p.suitability, specifications: p.specs, brandingMethods: p.branding, brandingNotes: p.brandingNotes, limitations: p.limitations, careInstructions: p.care, faqs: p.faqs ?? [] },
      variants: p.variants.map((v) => ({ label: v.label, skuSuffix: v.sku, options: v.options })),
      media: p.images.map((m) => ({ url: U(m.id), altText: m.alt })),
    }, db);
    created[p.key] = { productId: res.product.id, variantIds: res.variants.map((v) => v.id) };

    // One offer per variant from the owning vendor; the first variant also gets stock.
    for (const [i, variantId] of res.variants.map((v) => v.id).entries()) {
      const { offer } = await createOffer(mgr, {
        vendorId: vendorIds[p.vendor], variantId, supplierSku: `${p.key.toUpperCase().slice(0, 14)}-${p.variants[i]!.sku}`,
        moq: p.offer.moq, quantityIncrement: p.offer.inc, supplyMode: p.offer.mode ?? "ready_stock",
        leadTimeDaysMin: p.offer.lead[0], leadTimeDaysMax: p.offer.lead[1], brandingCapabilities: p.branding,
        tiers: [{ minQuantity: p.offer.moq, maxQuantity: p.offer.moq * 5 - 1, unitCostMinor: R(p.offer.costRupees) }, { minQuantity: p.offer.moq * 5, maxQuantity: null, unitCostMinor: R(p.offer.costRupees * 0.92) }],
        setupChargeMinor: R(p.offer.setupRupees ?? (p.branding.length ? 1500 : 0)), setupChargeScope: "per_design",
      }, db);
      if (p.offer.stock && (p.offer.mode ?? "ready_stock") !== "made_to_order") {
        const observedAt = p.offer.staleDays ? new Date(Date.now() - p.offer.staleDays * 86_400_000) : undefined;
        await adjustStock(mgr, { vendorId: vendorIds[p.vendor], offerId: offer.id, expectedVersion: 1, absoluteOnHand: Math.round(p.offer.stock / res.variants.length), reason: "Opening stock (demo)", observedAt }, db);
      }
    }
    console.log(`proposed: ${p.name} (${res.product.publicCode})`);
  }

  // Publish everything we proposed.
  const ours = new Set(Object.values(created).map((c) => c.productId));
  const pending = await listPendingRevisions(admin, db);
  for (const r of pending) if (ours.has(r.productId)) await approveAndPublishRevision(admin, { revisionId: r.revisionId, reason: "Demo catalogue publication" }, db);

  // Public prices.
  for (const p of DEMO_PRODUCTS) {
    const c = created[p.key];
    if (!c || existingSlugs.has(slugify(p.name))) continue;
    if (p.price.mode === "request_quote") { await setPublicPrice(admin, { productId: c.productId, mode: "request_quote", minQuantity: p.offer.moq, unitPriceMinor: null, reason: "Demo" }, db); continue; }
    for (const [qty, rupees] of p.price.tiers) await setPublicPrice(admin, { productId: c.productId, mode: p.price.mode, minQuantity: qty, unitPriceMinor: R(rupees), reason: "Demo" }, db);
  }

  // Fixed kits (platform-created, as in scripts/seed.ts).
  for (const k of DEMO_KITS) {
    if (existingSlugs.has(k.slug)) { console.log(`skip kit (exists): ${k.name}`); continue; }
    const comps = k.components.map((c) => ({ variantId: created[c.productKey]?.variantIds[c.variantIndex ?? 0], units: c.units ?? 1 })).filter((c) => c.variantId) as Array<{ variantId: string; units: number }>;
    if (comps.length !== k.components.length) { console.warn(`kit ${k.name}: missing components, skipped`); continue; }
    const ids = await withContextTransaction({ actorKind: "platform", actorId: adminRow.id, requestId: "seed-demo" }, async (tx) => {
      const code = await allocateReference(tx, "combo");
      const cat = await tx.query.categories.findFirst({ where: eq(schema.categories.slug, "gift-kits") });
      const [prod] = await tx.insert(schema.products).values({ publicCode: code, kind: "combo", slug: k.slug, lifecycle: "draft", primaryCategoryId: cat!.id, createdBy: adminRow.id }).returning();
      const [rev] = await tx.insert(schema.productRevisions).values({ productId: prod!.id, revisionNo: 1, reviewStatus: "submitted", authorUserId: adminRow.id, submittedAt: new Date(), content: { name: k.name, shortSummary: k.summary, description: k.description, keyBenefits: k.benefits, recipientSuitability: k.suitability, specifications: [{ name: "Packaging", value: `${k.packaging.name} ${k.packaging.dimensionsMm.map((d) => d / 10).join(" × ")} cm` }, { name: "Assembly", value: k.assemblyMode === "assembled" ? "Assembled together" : "Components dispatched separately" }], brandingMethods: k.branding, faqs: [] } }).returning();
      const terms = await tx.select().from(schema.taxonomyTerms).where(inArray(schema.taxonomyTerms.slug, k.terms));
      if (terms.length) await tx.insert(schema.productTerms).values(terms.map((t) => ({ productId: prod!.id, termId: t.id })));
      const [cr] = await tx.insert(schema.comboRevisions).values({ comboProductId: prod!.id, revisionNo: 1, comboType: "fixed", assemblyMode: k.assemblyMode, isCurrent: true, packaging: k.packaging, createdBy: adminRow.id }).returning();
      await tx.insert(schema.comboComponents).values(comps.map((c, i) => ({ comboRevisionId: cr!.id, variantId: c.variantId, unitsPerKit: c.units, sortOrder: i })));
      await tx.insert(schema.productMedia).values({ productId: prod!.id, url: U(k.image.id), altText: k.image.alt, isHero: true, approved: false, sortOrder: 0 });
      await refreshSupplySummary(tx, prod!.id);
      await refreshSearchDocument(tx, prod!.id);
      return { productId: prod!.id, revisionId: rev!.id };
    }, db);
    await approveAndPublishRevision(admin, { revisionId: ids.revisionId, reason: "Demo kit publication" }, db);
    await setPublicPrice(admin, { productId: ids.productId, mode: "from", minQuantity: k.moqKits, unitPriceMinor: R(k.priceRupees), reason: "Demo" }, db);
    console.log(`kit published: ${k.name}`);
  }

  const count = await withContextTransaction(systemContext(), (tx) => tx.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.lifecycle, "published")), db);
  console.log(`seed-demo complete: ${count.length} published products (incl. kits)`);
  await getPool().end();
}

main().catch((e) => { console.error(e); process.exit(1); });
