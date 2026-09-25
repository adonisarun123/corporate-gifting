/**
 * Spec §30 "first engineering vertical slice", run end-to-end against the runtime role (RLS on):
 *  1. Admin creates Vendor A and invites a manager.
 *  2. Manager submits a product with a variant, cost tier, stock and image.
 *  3. Admin reviews and publishes it.
 *  4. Visitor finds the product and submits an enquiry (idempotently).
 *  5. Admin requests a supplier confirmation.
 *  6. Vendor responds; admin issues a customer quote.
 *  7. Buyer views and accepts the correct revision.
 *  8. Audit history is complete; Vendor B cannot access any private record.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { actorFor, addMembership, auditActions, runtimeDb, seedBase, truncateAll, type Fixture } from "./helpers";
import { withContextTransaction } from "@/db/client";
import * as schema from "@/db/schema";
import { systemContext } from "@/modules/identity/actor";
import { acceptVendorInvitation, createVendor, inviteVendorManager } from "@/modules/vendors/service";
import { approveAndPublishRevision, listPendingRevisions, proposeProduct } from "@/modules/catalog/service";
import { getPublishedProductBySlug, listPublishedProducts, listFiltersSchema } from "@/modules/catalog/public";
import { adjustStock, createOffer, listVendorOffers, setPublicPrice } from "@/modules/supply/service";
import { addItem, getCartView, type CartOwner } from "@/modules/carts/service";
import { confirmEmailVerification, startEmailVerification } from "@/modules/verification/service";
import { getEnquiryForPlatform, submitEnquiry } from "@/modules/enquiries/service";
import { createSupplierRequest, getSourcingForEnquiry, getVendorRequest, listVendorRequests, submitSupplierResponse } from "@/modules/sourcing/service";
import { acceptQuoteRevision, draftQuoteRevision, getQuoteForCustomer, issueQuoteRevision } from "@/modules/quotes/service";
import { sha256Hex } from "@/lib/auth/signing";

const { db, pool } = runtimeDb();
let fx: Fixture;

beforeAll(async () => {
  await truncateAll();
  fx = await seedBase(db);
});
afterAll(async () => pool.end());

describe("vertical slice", () => {
  // Populated progressively; every read happens after the step that sets it.
  const state = {} as {
    vendorA: string; vendorB: string; productId: string; slug: string; variantId: string; offerId: string;
    enquiryId: string; enquiryItemId: string; requestId: string; quoteId: string; revision1: string; token1: string; hash1: string;
  };
  const guestOwner: CartOwner = { kind: "guest", tokenHash: sha256Hex("guest-token-1"), requestId: randomUUID() };

  it("1. admin creates Vendor A and invites a manager who accepts", async () => {
    const vendorA = await createVendor(fx.adminActor, { legalName: "Alpha Supplies Pvt Ltd", displayName: "Alpha Supplies", contactEmail: "ops@alpha.test" });
    expect(vendorA.vendorCode).toBe("VEN-0001");
    state.vendorA = vendorA.id;
    const { token } = await inviteVendorManager(fx.adminActor, { vendorId: vendorA.id, email: "vendor-a@test.local" });
    const managerActor = await actorFor(db, fx.vendorAUserId);
    const membership = await acceptVendorInvitation(managerActor, token, db);
    expect(membership.status).toBe("active");
    // Vendor B exists too, with its own manager, for isolation checks.
    const vendorB = await createVendor(fx.adminActor, { legalName: "Beta Traders", displayName: "Beta Traders", contactEmail: "ops@beta.test" });
    state.vendorB = vendorB.id;
    await addMembership(db, vendorB.id, fx.vendorBUserId);
  });

  it("2. manager proposes a product with a variant, cost tier, stock and image", async () => {
    const manager = await actorFor(db, fx.vendorAUserId);
    const proposal = await proposeProduct(manager, {
      vendorId: state.vendorA,
      content: {
        name: "Insulated Steel Bottle",
        shortSummary: "A 750 ml double-wall insulated bottle for daily desk and travel use.",
        description: "Double-wall vacuum insulated stainless steel bottle keeping drinks cold for 24 hours and hot for 12. Suitable for onboarding kits and event gifting with laser engraving.",
        keyBenefits: ["Keeps drinks hot or cold for hours", "Laser engraving area on the body"],
        recipientSuitability: "New joiners and event attendees",
        specifications: [{ name: "Capacity", value: "750", unit: "ml" }, { name: "Material", value: "Stainless steel" }],
        brandingMethods: ["laser_engraving"],
        faqs: [{ question: "Is it dishwasher safe?", answer: "Hand wash is recommended to protect the finish." }],
      },
      primaryCategorySlug: "drinkware",
      termSlugs: ["new-joiners", "onboarding"],
      variants: [{ label: "Navy, 750 ml", skuSuffix: "NV-750", options: { colour: "Navy" } }],
      media: [{ url: "https://cdn.example.test/img/insulated-steel-bottle-navy.jpg", altText: "Navy insulated steel bottle, front view" }],
    }, db);
    expect(proposal.product.publicCode).toBe("CGH-P-000001");
    expect(proposal.product.lifecycle).toBe("draft");
    state.productId = proposal.product.id;
    state.slug = proposal.product.slug;
    state.variantId = proposal.variants[0]!.id;

    const { offer } = await createOffer(manager, {
      vendorId: state.vendorA,
      variantId: state.variantId,
      supplierSku: "BOT750-NV",
      moq: 100,
      quantityIncrement: 50,
      leadTimeDaysMin: 10,
      leadTimeDaysMax: 15,
      tiers: [
        { minQuantity: 100, maxQuantity: 499, unitCostMinor: 52000 },
        { minQuantity: 500, maxQuantity: null, unitCostMinor: 48000 },
      ],
    }, db);
    state.offerId = offer.id;
    const stock = await adjustStock(manager, { vendorId: state.vendorA, offerId: offer.id, expectedVersion: 1, absoluteOnHand: 1200, reason: "Opening stock" }, db);
    expect(stock.onHand).toBe(1200);
    expect(stock.rowVersion).toBe(2);
  });

  it("2b. the storefront cannot see the draft product", async () => {
    expect(await getPublishedProductBySlug(state.slug, null, db)).toBeNull();
  });

  it("3. admin reviews and publishes; sets the public price", async () => {
    const pending = await listPendingRevisions(fx.adminActor, db);
    expect(pending).toHaveLength(1);
    const published = await approveAndPublishRevision(fx.adminActor, { revisionId: pending[0]!.revisionId, reason: "Content verified" }, db);
    expect(published.lifecycle).toBe("published");
    await setPublicPrice(fx.adminActor, { productId: state.productId, mode: "from", minQuantity: 250, unitPriceMinor: 65000 }, db);
  });

  it("4. visitor finds the product, builds an enquiry cart and submits idempotently", async () => {
    const list = await listPublishedProducts(listFiltersSchema.parse({ q: "steel bottle", quantity: 250 }), db);
    expect(list.total).toBe(1);
    const card = list.items[0]!;
    expect(card.price).toMatchObject({ mode: "from", unitPriceMinor: 65000, qualifyingQuantity: 250 });
    expect(card.minMoq).toBe(100);
    expect(card.stockState).toBe("fresh");
    // AC-19: nothing private in the public DTO
    const json = JSON.stringify(list);
    expect(json).not.toContain("VEN-0001");
    expect(json).not.toContain("BOT750");
    expect(json).not.toContain("52000");

    const detail = await getPublishedProductBySlug(state.slug, null, db);
    expect(detail?.variants[0]?.sku).toBe("CGH-P-000001-NV-750");

    await addItem(guestOwner, { productId: state.productId, variantId: state.variantId, quantity: 250, configuration: { branding: { method: "laser_engraving" } } }, db);
    // Same product + variant + configuration merges; a different configuration is a separate line.
    await addItem(guestOwner, { productId: state.productId, variantId: state.variantId, quantity: 50, configuration: { branding: { method: "laser_engraving" } } }, db);
    await addItem(guestOwner, { productId: state.productId, variantId: state.variantId, quantity: 100, configuration: { instructions: "Different engraving text" } }, db);
    const cart = (await getCartView(guestOwner, db))!;
    expect(cart.items).toHaveLength(2);
    expect(cart.items[0]!.quantity).toBe(300);
    expect(cart.knownSubtotalMinor).toBe(300 * 65000 + 100 * 0 + 0); // second line (100 units) is below the 250 qualifying qty → unknown
    expect(cart.hasUnknownCharges).toBe(true);

    const v = await startEmailVerification({ email: "priya@example-buyer.test" }, db);
    const code = (v as { testOnlyCode?: string }).testOnlyCode!;
    const confirmed = await confirmEmailVerification({ verificationId: v.verificationId, code }, db);
    expect(confirmed.verified).toBe(true);

    const payload = {
      cartId: cart.id,
      expectedCartVersion: cart.rowVersion,
      contactVerificationId: v.verificationId,
      contactName: "Priya Sharma",
      email: "priya@example-buyer.test",
      companyName: "Example Company",
      occasion: "employee_onboarding",
      recipientCount: 250,
      budget: { currency: "INR", perRecipientMinor: 150000, includesTax: true, includesBranding: true, includesShipping: false },
      destination: { country: "IN", city: "Bengaluru", postalCode: "560102" },
      requestedDeliveryDate: "2026-11-20",
      dateIsFlexible: false,
      processingNoticeVersion: "2026-09-01",
      processingAcknowledged: true,
      marketingOptIn: false,
    };
    const key = randomUUID();
    const first = await submitEnquiry(guestOwner, key, payload, db);
    expect(first.reference).toMatch(/^CGE-\d{4}-000001$/);
    // AC-04: retry with same key and payload returns the same enquiry.
    const second = await submitEnquiry(guestOwner, key, payload, db);
    expect(second.enquiryId).toBe(first.enquiryId);
    // Same key, different payload → 409.
    await expect(submitEnquiry(guestOwner, key, { ...payload, recipientCount: 251 }, db)).rejects.toMatchObject({ code: "idempotency_conflict" });
    state.enquiryId = first.enquiryId;

    const view = await getEnquiryForPlatform(fx.adminActor, state.enquiryId, db);
    expect(view.items).toHaveLength(2);
    expect(view.items[0]!.snapshot.estimate?.unitPriceMinor).toBe(65000);
    state.enquiryItemId = view.items[0]!.id;
  });

  it("AC-06: a later catalogue price change does not rewrite the submitted snapshot", async () => {
    await setPublicPrice(fx.adminActor, { productId: state.productId, mode: "from", minQuantity: 250, unitPriceMinor: 70000, reason: "Price revision" }, db);
    const view = await getEnquiryForPlatform(fx.adminActor, state.enquiryId, db);
    expect(view.items[0]!.snapshot.estimate?.unitPriceMinor).toBe(65000);
  });

  it("5. admin requests supplier confirmation from Vendor A only", async () => {
    const req = await createSupplierRequest(fx.adminActor, {
      enquiryId: state.enquiryId,
      vendorId: state.vendorA,
      items: [{ enquiryItemId: state.enquiryItemId, variantId: state.variantId, quantity: 300, requirements: "Laser engraving, single colour logo" }],
      dueAt: new Date(Date.now() + 2 * 86_400_000),
    }, db);
    expect(req.status).toBe("sent");
    expect(req.deliveryRegion).toBe("Bengaluru 560xxx");
    state.requestId = req.id;
    const e = await getEnquiryForPlatform(fx.adminActor, state.enquiryId, db);
    expect(e.enquiry.status).toBe("sourcing");
  });

  it("6. Vendor A responds without seeing the customer; admin drafts and issues a quote", async () => {
    const managerA = await actorFor(db, fx.vendorAUserId);
    const requests = await listVendorRequests(managerA, state.vendorA, db);
    expect(requests).toHaveLength(1);
    const detail = await getVendorRequest(managerA, state.vendorA, state.requestId, db);
    expect(JSON.stringify(detail)).not.toContain("Priya");
    expect(JSON.stringify(detail)).not.toContain("Example Company");
    const itemId = detail.items[0]!.id;
    const resp = await submitSupplierResponse(managerA, {
      vendorId: state.vendorA,
      requestId: state.requestId,
      validUntil: new Date(Date.now() + 10 * 86_400_000),
      items: [{ requestItemId: itemId, unitCostMinor: 50000, brandingUnitCostMinor: 2500, setupChargeMinor: 150000, readyQuantity: 1200, leadTimeDaysMin: 10, leadTimeDaysMax: 14 }],
    }, db);
    expect(resp.versionNo).toBe(1);

    const sourcing = await getSourcingForEnquiry(fx.adminActor, state.enquiryId, db);
    const responseItem = sourcing[0]!.latestResponseItems[0]!;
    const draft = await draftQuoteRevision(fx.adminActor, {
      enquiryId: state.enquiryId,
      lines: [{ enquiryItemId: state.enquiryItemId, unitPriceMinor: 70000, taxRateBp: 1800, supplierResponseItemId: responseItem.id, allocatedFulfilmentMinor: 60000 }],
      charges: [],
      discountMinor: 0,
      terms: {
        validityDays: 14,
        paymentTerms: "50% advance, balance before dispatch",
        deliveryTerms: "Delivered to one Bengaluru address",
        leadTimeAssumptions: "10–14 working days after artwork approval",
        inclusions: "Excludes GST unless shown; includes laser engraving",
        termsVersion: "T-2026-09",
        quoteContact: { name: "Sales Desk", email: "sales@example.test" },
      },
    }, db);
    // 300 × 70000 = 21,000,000 revenue; cost = 300×50000 + 300×2500 + 150000 + 60000 = 15,960,000 → margin 24%
    expect(draft.calc.preTaxTotalMinor).toBe(21_000_000);
    expect(draft.calc.totalCostMinor).toBe(15_960_000);
    expect(draft.calc.grossMarginBp).toBe(2400);
    expect(draft.calc.taxMinor).toBe(3_780_000);
    expect(draft.needsMarginApproval).toBe(false);

    const issued = await issueQuoteRevision(fx.adminActor, { revisionId: draft.revision.id }, db);
    expect(issued.quoteNumber).toBe("CGQ-" + new Date().getUTCFullYear() + "-000001-R01");
    state.quoteId = issued.quoteId;
    state.revision1 = issued.revisionId;
    state.token1 = issued.accessToken;
    state.hash1 = issued.documentHash;
    const e = await getEnquiryForPlatform(fx.adminActor, state.enquiryId, db);
    expect(e.enquiry.status).toBe("quoted");
  });

  it("7. buyer views the quote; an old revision cannot be accepted after supersession (AC-14, AC-15)", async () => {
    const access = { kind: "token" as const, token: state.token1, requestId: randomUUID() };
    const view = await getQuoteForCustomer(access, state.quoteId, db);
    expect(view.document.totalMinor).toBe(24_780_000);
    expect(JSON.stringify(view)).not.toMatch(/50000|marginBp|VEN-|BOT750/);

    // Admin revises: new revision supersedes R01.
    const sourcing = await getSourcingForEnquiry(fx.adminActor, state.enquiryId, db);
    const responseItem = sourcing[0]!.latestResponseItems[0]!;
    const draft2 = await draftQuoteRevision(fx.adminActor, {
      enquiryId: state.enquiryId,
      lines: [{ enquiryItemId: state.enquiryItemId, unitPriceMinor: 68000, taxRateBp: 1800, supplierResponseItemId: responseItem.id, allocatedFulfilmentMinor: 60000 }],
      charges: [],
      discountMinor: 0,
      terms: { validityDays: 14, paymentTerms: "50% advance", deliveryTerms: "Bengaluru", leadTimeAssumptions: "10–14 days", inclusions: "Ex GST", termsVersion: "T-2026-09", quoteContact: { name: "Sales", email: "sales@example.test" } },
    }, db);
    const issued2 = await issueQuoteRevision(fx.adminActor, { revisionId: draft2.revision.id }, db);
    expect(issued2.quoteNumber).toMatch(/-R02$/);

    // Old tab tries to accept R01.
    await expect(acceptQuoteRevision(access, state.quoteId, { revisionId: state.revision1, documentHash: state.hash1 }, db)).rejects.toMatchObject({
      code: "conflict",
      details: { currentRevisionId: issued2.revisionId },
    });
    // R01 document is intact and marked superseded.
    const r1 = await withContextTransaction(systemContext(), (tx) => tx.query.quoteRevisions.findFirst({ where: eq(schema.quoteRevisions.id, state.revision1) }), db);
    expect(r1?.status).toBe("superseded");
    expect(r1?.documentHash).toBe(state.hash1);

    // Accept the current revision with the original link (still valid for the quote family).
    const current = await getQuoteForCustomer(access, state.quoteId, db);
    const acceptance = await acceptQuoteRevision(access, state.quoteId, { revisionId: issued2.revisionId, documentHash: current.documentHash! }, db);
    expect(acceptance.quoteNumber).toMatch(/-R02$/);
    const e = await getEnquiryForPlatform(fx.adminActor, state.enquiryId, db);
    expect(e.enquiry.status).toBe("accepted");
    // Accepted is not order_confirmed.
    expect(e.enquiry.status).not.toBe("order_confirmed");
  });

  it("8a. audit history covers every step", async () => {
    const actions = await auditActions(db);
    for (const a of [
      "vendor.created",
      "vendor.manager.invited",
      "vendor.invitation.accepted",
      "catalog.product.proposed",
      "supply.offer.created",
      "supply.stock.adjusted",
      "catalog.revision.approved_published",
      "pricing.public_price.set",
      "enquiry.created",
      "sourcing.request.created",
      "sourcing.response.submitted",
      "quote.revision.drafted",
      "quote.revision.issued",
      "quote.revision.viewed",
      "quote.revision.superseded",
      "quote.revision.accepted",
      "enquiry.status.changed",
    ]) {
      expect(actions, `missing audit action ${a}`).toContain(a);
    }
  });

  it("8b. Vendor B cannot see or touch Vendor A's private records (AC-07, AC-08)", async () => {
    const managerB = await actorFor(db, fx.vendorBUserId);
    // Forged vendorId: membership check fails before any query.
    await expect(listVendorOffers(managerB, state.vendorA, db)).rejects.toMatchObject({ code: "forbidden" });
    await expect(listVendorRequests(managerB, state.vendorA, db)).rejects.toMatchObject({ code: "forbidden" });
    await expect(adjustStock(managerB, { vendorId: state.vendorA, offerId: state.offerId, expectedVersion: 2, delta: -10 }, db)).rejects.toMatchObject({ code: "forbidden" });
    // Even a direct query in Vendor B's DB context returns nothing (RLS).
    const leaked = await withContextTransaction({ actorKind: "vendor", vendorId: state.vendorB, actorId: fx.vendorBUserId, requestId: "t" }, async (tx) => {
      const offers = await tx.select().from(schema.vendorOffers);
      const tiers = await tx.select().from(schema.offerPriceTiers);
      const reqs = await tx.select().from(schema.supplierRequests);
      const resp = await tx.select().from(schema.supplierResponseItems);
      const inv = await tx.select().from(schema.inventoryBalances);
      return offers.length + tiers.length + reqs.length + resp.length + inv.length;
    }, db);
    expect(leaked).toBe(0);
    // And Vendor B cannot insert a row claiming Vendor A's id.
    await expect(
      withContextTransaction({ actorKind: "vendor", vendorId: state.vendorB, actorId: fx.vendorBUserId, requestId: "t" }, (tx) =>
        tx.insert(schema.inventoryMovements).values({ offerId: state.offerId, vendorId: state.vendorA, kind: "issue", delta: -1, resultingOnHand: 1199 }), db),
    ).rejects.toThrow();
  });

  it("AC-17: sequential requests from two vendors on the same pooled connection do not leak context", async () => {
    const single = new (await import("pg")).Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const one = drizzle(single, { schema });
    const a = await withContextTransaction({ actorKind: "vendor", vendorId: state.vendorA, requestId: "a" }, (tx) => tx.select().from(schema.vendorOffers), one);
    const b = await withContextTransaction({ actorKind: "vendor", vendorId: state.vendorB, requestId: "b" }, (tx) => tx.select().from(schema.vendorOffers), one);
    const none = await one.select().from(schema.vendorOffers); // no context at all → default deny
    expect(a.length).toBe(1);
    expect(b.length).toBe(0);
    expect(none.length).toBe(0);
    await single.end();
  });

  it("AC-11: concurrent stock edits — second writer gets a conflict with a reload path", async () => {
    const managerA = await actorFor(db, fx.vendorAUserId);
    const offers = await listVendorOffers(managerA, state.vendorA, db);
    const version = offers[0]!.stockVersion!;
    await adjustStock(managerA, { vendorId: state.vendorA, offerId: state.offerId, expectedVersion: version, delta: -100, kind: "issue" }, db);
    await expect(adjustStock(managerA, { vendorId: state.vendorA, offerId: state.offerId, expectedVersion: version, delta: -50, kind: "issue" }, db)).rejects.toMatchObject({
      code: "conflict",
      details: { currentVersion: version + 1 },
    });
  });

  it("AC-18: a failed audit insert rolls back the business mutation", async () => {
    const managerA = await actorFor(db, fx.vendorAUserId);
    const before = await listVendorOffers(managerA, state.vendorA, db);
    const version = before[0]!.stockVersion!;
    // Simulate audit failure by making the audit table temporarily unwritable for this tx via a bad request id type.
    await expect(
      withContextTransaction({ actorKind: "vendor", vendorId: state.vendorA, actorId: fx.vendorAUserId, requestId: "x" }, async (tx) => {
        await tx.update(schema.inventoryBalances).set({ onHand: 5 }).where(eq(schema.inventoryBalances.offerId, state.offerId));
        // audit_events.entity_id is uuid; an invalid value makes the mandatory insert fail.
        await tx.insert(schema.auditEvents).values({ actorKind: "vendor", action: "test.fail", entityType: "x", entityId: "not-a-uuid" as never });
      }, db),
    ).rejects.toThrow();
    const after = await listVendorOffers(managerA, state.vendorA, db);
    expect(after[0]!.onHand).toBe(before[0]!.onHand);
    expect(after[0]!.stockVersion).toBe(version);
  });

  it("AC-16: a suspended membership is denied on the next request", async () => {
    await withContextTransaction(systemContext(), (tx) =>
      tx.update(schema.vendorMemberships).set({ status: "suspended" }).where(eq(schema.vendorMemberships.userId, fx.vendorAUserId)), db);
    const managerA = await actorFor(db, fx.vendorAUserId);
    await expect(listVendorOffers(managerA, state.vendorA, db)).rejects.toMatchObject({ code: "forbidden" });
  });
});

