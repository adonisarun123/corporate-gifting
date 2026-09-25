/**
 * Synthetic seed for local/preview (spec §29 test data pack). Uses the same services as the UI,
 * so audit, references and projections are exercised. Idempotent-ish: refuses to run if users exist.
 * Never run against production.
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { getDb, getPool, withContextTransaction } from "@/db/client";
import * as schema from "@/db/schema";
import { systemContext } from "@/modules/identity/actor";
import { resolveActorByUserId } from "@/modules/identity/service";
import { createVendor } from "@/modules/vendors/service";
import { approveAndPublishRevision, listPendingRevisions, proposeProduct } from "@/modules/catalog/service";
import { adjustStock, createOffer, setPublicPrice } from "@/modules/supply/service";

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("seed refuses to run in production");
  const db = getDb();
  const existing = await withContextTransaction(systemContext(), (tx) => tx.select({ id: schema.users.id }).from(schema.users).limit(1), db);
  if (existing.length) { console.log("seed: users already exist, skipping"); await getPool().end(); return; }

  const ids = await withContextTransaction(systemContext(), async (tx) => {
    const mk = async (email: string, name: string, status: "active" | "suspended" = "active") => (await tx.insert(schema.users).values({ authSubject: `dev:${email}`, email, displayName: name, status }).returning())[0]!.id;
    const owner = await mk("owner@cgh.local", "Arun (Owner)");
    const admin = await mk("admin@cgh.local", "Platform Admin");
    const sales = await mk("sales@cgh.local", "Sales Executive");
    const editor = await mk("editor@cgh.local", "Catalogue Editor");
    const va = await mk("manager@alpha.local", "Alpha Manager");
    const va2 = await mk("manager2@alpha.local", "Alpha Manager (suspended)", "suspended");
    const vb = await mk("manager@beta.local", "Beta Manager");
    const b1 = await mk("buyer1@example.local", "Priya (Buyer)");
    const b2 = await mk("buyer2@example.local", "Rahul (Buyer)");
    await tx.insert(schema.userPlatformRoles).values([{ userId: owner, role: "owner" }, { userId: admin, role: "admin" }, { userId: sales, role: "sales" }, { userId: editor, role: "catalog_editor" }]);
    await tx.insert(schema.categories).values([
      { slug: "drinkware", name: "Drinkware", sortOrder: 1 }, { slug: "stationery", name: "Stationery", sortOrder: 2 }, { slug: "bags", name: "Bags", sortOrder: 3 },
      { slug: "technology-accessories", name: "Technology accessories", sortOrder: 4 }, { slug: "apparel", name: "Apparel", sortOrder: 5 }, { slug: "desk-accessories", name: "Desk accessories", sortOrder: 6 },
      { slug: "food-hampers", name: "Food hampers", sortOrder: 7 }, { slug: "wellness", name: "Wellness", sortOrder: 8 }, { slug: "home-and-lifestyle", name: "Home and lifestyle", sortOrder: 9 }, { slug: "gift-kits", name: "Gift kits", sortOrder: 10 },
    ]);
    await tx.insert(schema.taxonomyTerms).values([
      ...["new-joiners|New joiners", "employees|Employees", "clients|Clients", "channel-partners|Channel partners", "executives|Executives", "event-attendees|Event attendees", "remote-teams|Remote teams"].map((s, i) => { const [slug, name] = s.split("|") as [string, string]; return { kind: "recipient" as const, slug, name, sortOrder: i }; }),
      ...["onboarding|Onboarding", "employee-recognition|Employee recognition", "work-anniversaries|Work anniversaries", "conferences|Conferences", "festive-gifting|Festive gifting", "client-appreciation|Client appreciation", "company-milestones|Company milestones"].map((s, i) => { const [slug, name] = s.split("|") as [string, string]; return { kind: "occasion" as const, slug, name, sortOrder: i }; }),
    ]);
    await tx.insert(schema.systemSettings).values({ key: "commercial.margin_floor_bp", value: 1500 });
    return { owner, admin, va, va2, vb, b1, b2 };
  }, db);

  const admin = (await resolveActorByUserId(ids.admin, "seed", db))!;
  const alpha = await createVendor(admin, { legalName: "Alpha Supplies Private Limited", displayName: "Alpha Supplies", contactEmail: "ops@alpha.local", serviceCategories: ["drinkware", "stationery"], serviceableRegions: ["KA", "TN", "MH"] }, db);
  const beta = await createVendor(admin, { legalName: "Beta Traders LLP", displayName: "Beta Traders", contactEmail: "ops@beta.local", serviceCategories: ["drinkware", "bags"], serviceableRegions: ["KA", "DL"] }, db);
  await withContextTransaction(systemContext(), (tx) => tx.insert(schema.vendorMemberships).values([
    { vendorId: alpha.id, userId: ids.va, role: "owner", status: "active" },
    { vendorId: alpha.id, userId: ids.va2, role: "manager", status: "suspended" },
    { vendorId: beta.id, userId: ids.vb, role: "manager", status: "active" },
  ]), db);

  const mgrA = (await resolveActorByUserId(ids.va, "seed", db))!;
  const mgrB = (await resolveActorByUserId(ids.vb, "seed", db))!;

  const bottle = await proposeProduct(mgrA, {
    vendorId: alpha.id, primaryCategorySlug: "drinkware", termSlugs: ["new-joiners", "employees", "onboarding", "conferences"],
    content: { name: "Insulated Steel Bottle", shortSummary: "A 750 ml double-wall insulated stainless steel bottle for desk and travel use, with laser engraving.", description: "Double-wall vacuum-insulated stainless steel bottle that keeps drinks cold for about 24 hours and hot for about 12. Leak-resistant screw cap, matte powder-coated finish and a generous engraving panel on the body. Widely used in onboarding kits and conference giveaways.", keyBenefits: ["Keeps drinks hot or cold for hours", "Large laser-engraving area", "Leak-resistant cap"], recipientSuitability: "New joiners, employees and event attendees who commute or travel.", limitations: "Not suitable for carbonated drinks. Hand wash recommended.", careInstructions: "Hand wash; do not microwave.", specifications: [{ name: "Capacity", value: "750", unit: "ml" }, { name: "Material", value: "Stainless steel 304" }, { name: "Weight", value: "320", unit: "g" }, { name: "Packaging", value: "Individual kraft box" }], brandingMethods: ["laser_engraving"], brandingNotes: "Single-position engraving up to 60 × 30 mm.", faqs: [{ question: "Can we engrave individual names?", answer: "Yes, name personalisation is quoted per unit and adds two working days." }] },
    variants: [{ label: "Navy, 750 ml", skuSuffix: "NV-750", options: { colour: "Navy", capacity: { value: 750, unit: "ml" } } }, { label: "Sage, 750 ml", skuSuffix: "SG-750", options: { colour: "Sage", capacity: { value: 750, unit: "ml" } } }],
    media: [{ url: "https://placehold.co/1200x900/0F5B52/FFFFFF.png?text=Insulated+Steel+Bottle", altText: "Navy insulated steel bottle, front view" }],
  }, db);
  const notebook = await proposeProduct(mgrA, {
    vendorId: alpha.id, primaryCategorySlug: "stationery", termSlugs: ["new-joiners", "employees", "onboarding"],
    content: { name: "Hardcover A5 Notebook", shortSummary: "A5 hardcover notebook with 192 ruled pages, ribbon marker and debossed logo option.", description: "Vegan-leather textured hardcover notebook with 192 ruled 80 gsm pages, elastic closure, ribbon marker and an expandable back pocket. Debossing on the front cover is included in the branding options.", keyBenefits: ["192 ruled pages", "Debossed logo up to 80 × 40 mm", "Elastic closure and ribbon marker"], recipientSuitability: "New joiners and employees.", specifications: [{ name: "Size", value: "A5" }, { name: "Pages", value: "192" }, { name: "Paper", value: "80 gsm ruled" }], brandingMethods: ["debossing", "foil_stamping"], faqs: [] },
    variants: [{ label: "Charcoal", skuSuffix: "CH", options: { colour: "Charcoal" } }],
    media: [{ url: "https://placehold.co/1200x900/172B3A/FFFFFF.png?text=A5+Notebook", altText: "Charcoal A5 hardcover notebook" }],
  }, db);
  const tote = await proposeProduct(mgrB, {
    vendorId: beta.id, primaryCategorySlug: "bags", termSlugs: ["event-attendees", "conferences", "employees"],
    content: { name: "Canvas Conference Tote", shortSummary: "14 oz cotton canvas tote with a 12 × 12 inch screen-print area, made to order.", description: "Heavy 14 oz cotton canvas tote bag with reinforced handles and an internal pocket. Produced to order in 12–18 working days with single- or two-colour screen printing.", keyBenefits: ["Heavy 14 oz canvas", "Large print area", "Reinforced handles"], recipientSuitability: "Event attendees and conference delegates.", specifications: [{ name: "Material", value: "14 oz cotton canvas" }, { name: "Size", value: "38 × 42 × 10", unit: "cm" }], brandingMethods: ["screen_print"], faqs: [] },
    variants: [{ label: "Natural", skuSuffix: "NAT", options: { colour: "Natural" } }],
    media: [],
  }, db);

  // Offers: bottle from both vendors (multi-supplier), notebook from Alpha, tote made-to-order from Beta.
  const bottleNavy = bottle.variants[0]!.id;
  const { offer: oA } = await createOffer(mgrA, { vendorId: alpha.id, variantId: bottleNavy, supplierSku: "BOT750-NV", moq: 100, quantityIncrement: 50, leadTimeDaysMin: 10, leadTimeDaysMax: 15, brandingCapabilities: ["laser_engraving"], tiers: [{ minQuantity: 100, maxQuantity: 499, unitCostMinor: 52000 }, { minQuantity: 500, maxQuantity: null, unitCostMinor: 48000 }] }, db);
  const { offer: oB } = await createOffer(mgrB, { vendorId: beta.id, variantId: bottleNavy, supplierSku: "B-BTL-NAVY", moq: 200, quantityIncrement: 100, leadTimeDaysMin: 7, leadTimeDaysMax: 12, brandingCapabilities: ["laser_engraving"], tiers: [{ minQuantity: 200, maxQuantity: null, unitCostMinor: 49500 }] }, db);
  const { offer: oN } = await createOffer(mgrA, { vendorId: alpha.id, variantId: notebook.variants[0]!.id, supplierSku: "NB-A5-CH", moq: 100, quantityIncrement: 50, leadTimeDaysMin: 7, leadTimeDaysMax: 10, brandingCapabilities: ["debossing"], tiers: [{ minQuantity: 100, maxQuantity: null, unitCostMinor: 21000 }] }, db);
  await createOffer(mgrB, { vendorId: beta.id, variantId: tote.variants[0]!.id, supplierSku: "TOTE-14-NAT", moq: 250, quantityIncrement: 50, supplyMode: "made_to_order", leadTimeDaysMin: 12, leadTimeDaysMax: 18, brandingCapabilities: ["screen_print"], tiers: [{ minQuantity: 250, maxQuantity: null, unitCostMinor: 18000 }] }, db);
  await adjustStock(mgrA, { vendorId: alpha.id, offerId: oA.id, expectedVersion: 1, absoluteOnHand: 1200, reason: "Opening stock" }, db);
  // Beta's stock is deliberately stale (observed 20 days ago) to exercise "availability to be confirmed".
  await adjustStock(mgrB, { vendorId: beta.id, offerId: oB.id, expectedVersion: 1, absoluteOnHand: 400, reason: "Opening stock", observedAt: new Date(Date.now() - 20 * 86_400_000) }, db);
  await adjustStock(mgrA, { vendorId: alpha.id, offerId: oN.id, expectedVersion: 1, absoluteOnHand: 3000, reason: "Opening stock" }, db);

  // Fixed combo (platform-created): welcome kit = bottle + notebook.
  const comboIds = await withContextTransaction({ actorKind: "platform", actorId: ids.admin, requestId: "seed" }, async (tx) => {
    const { allocateReference } = await import("@/modules/references/service");
    const code = await allocateReference(tx, "combo");
    const cat = await tx.query.categories.findFirst({ where: eq(schema.categories.slug, "gift-kits") });
    const [p] = await tx.insert(schema.products).values({ publicCode: code, kind: "combo", slug: "new-joiner-welcome-kit", lifecycle: "draft", primaryCategoryId: cat!.id, createdBy: ids.admin }).returning();
    const [rev] = await tx.insert(schema.productRevisions).values({ productId: p!.id, revisionNo: 1, reviewStatus: "submitted", authorUserId: ids.admin, submittedAt: new Date(), content: { name: "New Joiner Welcome Kit", shortSummary: "Insulated bottle and A5 notebook, assembled in a branded kraft box for day-one desks.", description: "A two-piece welcome kit: the 750 ml insulated steel bottle and the A5 hardcover notebook, packed together in a kraft mailer box with a welcome card slot. Assembled and dispatched together.", keyBenefits: ["Two everyday items", "Assembled together", "Single branding brief"], recipientSuitability: "New joiners in office and hybrid teams.", specifications: [{ name: "Packaging", value: "Kraft mailer box 30 × 22 × 10 cm" }], brandingMethods: ["laser_engraving", "debossing"], faqs: [] } }).returning();
    const terms = await tx.select().from(schema.taxonomyTerms).where(eq(schema.taxonomyTerms.slug, "new-joiners"));
    const occ = await tx.select().from(schema.taxonomyTerms).where(eq(schema.taxonomyTerms.slug, "onboarding"));
    await tx.insert(schema.productTerms).values([{ productId: p!.id, termId: terms[0]!.id }, { productId: p!.id, termId: occ[0]!.id }]);
    const [cr] = await tx.insert(schema.comboRevisions).values({ comboProductId: p!.id, revisionNo: 1, comboType: "fixed", assemblyMode: "assembled", isCurrent: true, packaging: { name: "Kraft mailer box", dimensionsMm: [300, 220, 100] }, createdBy: ids.admin }).returning();
    await tx.insert(schema.comboComponents).values([{ comboRevisionId: cr!.id, variantId: bottleNavy, unitsPerKit: 1, sortOrder: 0 }, { comboRevisionId: cr!.id, variantId: notebook.variants[0]!.id, unitsPerKit: 1, sortOrder: 1 }]);
    await tx.insert(schema.productMedia).values({ productId: p!.id, url: "https://placehold.co/1200x900/B98239/FFFFFF.png?text=Welcome+Kit", altText: "Welcome kit with bottle and notebook in a kraft box", isHero: true });
    return { productId: p!.id, revisionId: rev!.id };
  }, db);

  // Publish everything except the tote (left pending for the approval inbox demo).
  const pending = await listPendingRevisions(admin, db);
  for (const r of pending) if (r.productId !== tote.product.id) await approveAndPublishRevision(admin, { revisionId: r.revisionId, reason: "Seed publication" }, db);
  await setPublicPrice(admin, { productId: bottle.product.id, mode: "from", minQuantity: 250, unitPriceMinor: 65000, reason: "Seed" }, db);
  await setPublicPrice(admin, { productId: bottle.product.id, mode: "from", minQuantity: 1000, unitPriceMinor: 59000, reason: "Seed" }, db);
  await setPublicPrice(admin, { productId: notebook.product.id, mode: "indicative", minQuantity: 100, unitPriceMinor: 32000, reason: "Seed" }, db);
  await setPublicPrice(admin, { productId: comboIds.productId, mode: "from", minQuantity: 100, unitPriceMinor: 99000, reason: "Seed" }, db);
  // Tote and combo variants: combo has no variants; tote stays request-quote (unpublished anyway).

  console.log("seed complete:");
  console.log("  staff: owner@cgh.local, admin@cgh.local, sales@cgh.local, editor@cgh.local");
  console.log("  vendors: manager@alpha.local (Alpha, owner), manager2@alpha.local (suspended), manager@beta.local (Beta)");
  console.log("  buyers: buyer1@example.local, buyer2@example.local");
  console.log(`  published: ${bottle.product.publicCode}, ${notebook.product.publicCode}, welcome kit; pending approval: ${tote.product.publicCode}`);
  await getPool().end();
}

main().catch((e) => { console.error(e); process.exit(1); });
