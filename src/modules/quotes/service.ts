import { and, asc, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { createHash } from "node:crypto";
import { getDb, withContextTransaction, type Db, type DbContext, type Tx } from "@/db/client";
import {
  contacts,
  enquiries,
  enquiryItems,
  quoteAcceptances,
  quoteAccessTokens,
  quoteItems,
  quoteRevisionCostings,
  quoteRevisions,
  quotes,
  supplierResponseItems,
  supplierResponses,
  systemSettings,
} from "@/db/schema";
import type { QuoteCustomerDocument, QuoteTermsSnapshot } from "@/db/schema/types";
import { AppError, businessRule, conflict, forbidden, notFound } from "@/lib/errors";
import { randomToken, sha256Hex } from "@/lib/auth/signing";
import { appendAudit } from "@/modules/audit/service";
import { appendOutbox } from "@/modules/outbox/service";
import { allocateReference, quoteRevisionNumber } from "@/modules/references/service";
import { calculateQuote } from "@/modules/pricing/quote-calc";
import { transitionEnquiryTx } from "@/modules/enquiries/service";
import { buyerContext, platformContext, requirePermission, requireUser, type Actor, type AuthenticatedActor } from "@/modules/identity/actor";

const termsSchema = z.object({
  validityDays: z.number().int().min(1).max(90),
  paymentTerms: z.string().min(3).max(500),
  deliveryTerms: z.string().min(3).max(500),
  leadTimeAssumptions: z.string().min(3).max(500),
  inclusions: z.string().min(3).max(500),
  termsVersion: z.string().min(1).max(40),
  quoteContact: z.object({ name: z.string().min(2).max(120), email: z.string().email() }),
});

export const draftQuoteSchema = z.object({
  enquiryId: z.string().uuid(),
  lines: z
    .array(
      z.object({
        enquiryItemId: z.string().uuid(),
        unitPriceMinor: z.number().int().positive(),
        taxRateBp: z.number().int().min(0).max(10000),
        inclusions: z.string().max(300).default("Excludes GST, custom branding and shipping unless stated."),
        /** Frozen supplier response line used for cost; optional for platform-sourced lines. */
        supplierResponseItemId: z.string().uuid().nullable().default(null),
        manualUnitCostMinor: z.number().int().nonnegative().optional(),
        allocatedFulfilmentMinor: z.number().int().nonnegative().default(0),
      }),
    )
    .min(1)
    .max(100),
  charges: z.array(z.object({ label: z.string().min(1).max(80), amountMinor: z.number().int().nonnegative(), taxRateBp: z.number().int().min(0).max(10000) })).max(10).default([]),
  discountMinor: z.number().int().nonnegative().default(0),
  terms: termsSchema,
});
export type DraftQuoteInput = z.infer<typeof draftQuoteSchema>;

const DEFAULT_MARGIN_FLOOR_BP = 1500;

async function marginFloorBp(tx: Tx): Promise<number> {
  const row = await tx.query.systemSettings.findFirst({ where: eq(systemSettings.key, "commercial.margin_floor_bp") });
  const v = Number(row?.value);
  return Number.isFinite(v) ? v : DEFAULT_MARGIN_FLOOR_BP;
}

/**
 * Create a new DRAFT revision (revision 1 creates the quote family). Costs are frozen from the
 * referenced supplier response lines into a private costing record; the customer document is
 * built only at issue time.
 */
export async function draftQuoteRevision(actor: Actor, raw: unknown, db: Db = getDb()) {
  const user = requirePermission(actor, "quotes:draft");
  const input = draftQuoteSchema.parse(raw);
  return withContextTransaction(
    platformContext(user),
    async (tx) => {
      const enquiry = await tx.query.enquiries.findFirst({ where: eq(enquiries.id, input.enquiryId) });
      if (!enquiry) throw notFound("Enquiry not found");
      if (["closed", "order_confirmed"].includes(enquiry.status)) throw conflict(`Enquiry is ${enquiry.status}`);
      const lines = await tx.select().from(enquiryItems).where(eq(enquiryItems.enquiryId, enquiry.id));
      const byId = new Map(lines.map((l) => [l.id, l]));

      // Resolve private costs.
      const costLines = [];
      for (const [idx, l] of input.lines.entries()) {
        const item = byId.get(l.enquiryItemId);
        if (!item) throw businessRule("Quote line does not belong to this enquiry");
        let unitCost = l.manualUnitCostMinor ?? null;
        let brandingUnit = 0;
        let setup = 0;
        let vendorId: string | null = null;
        let responseId: string | null = null;
        if (l.supplierResponseItemId) {
          const [ri] = await tx
            .select({ item: supplierResponseItems, response: supplierResponses })
            .from(supplierResponseItems)
            .innerJoin(supplierResponses, eq(supplierResponses.id, supplierResponseItems.responseId))
            .where(eq(supplierResponseItems.id, l.supplierResponseItemId));
          if (!ri) throw businessRule("Supplier response line not found");
          if (ri.response.status !== "submitted") throw businessRule("Supplier response is not a priced submission");
          if (ri.response.validUntil && ri.response.validUntil < new Date()) throw businessRule("Supplier response has expired");
          unitCost = ri.item.unitCostMinor;
          brandingUnit = ri.item.brandingUnitCostMinor;
          setup = ri.item.setupChargeMinor;
          vendorId = ri.item.vendorId;
          responseId = ri.response.id;
        }
        if (unitCost === null) throw businessRule("Each line needs a supplier response or a manual cost", { [`lines.${idx}`]: ["cost required"] });
        costLines.push({ lineNo: idx + 1, item, input: l, unitCost, brandingUnit, setup, vendorId, responseId });
      }

      const floor = await marginFloorBp(tx);
      const calc = calculateQuote({
        lines: costLines.map((c) => ({
          lineNo: c.lineNo,
          quantity: c.item.quantity,
          unitPriceMinor: c.input.unitPriceMinor,
          taxRateBp: c.input.taxRateBp,
          cost: { unitCostMinor: c.unitCost, brandingUnitCostMinor: c.brandingUnit, setupChargeMinor: c.setup, allocatedFulfilmentMinor: c.input.allocatedFulfilmentMinor },
        })),
        charges: input.charges,
        discountMinor: input.discountMinor,
        marginFloorBp: floor,
      });

      let quote = await tx.query.quotes.findFirst({ where: eq(quotes.enquiryId, enquiry.id) });
      if (!quote) {
        const quoteNumber = await allocateReference(tx, "quote");
        [quote] = await tx.insert(quotes).values({ enquiryId: enquiry.id, quoteNumber, createdBy: user.userId }).returning();
        if (!quote) throw new Error("quote insert failed");
      }
      const last = await tx.query.quoteRevisions.findFirst({ where: eq(quoteRevisions.quoteId, quote.id), orderBy: desc(quoteRevisions.revisionNo) });
      if (last && last.status === "draft") throw conflict("A draft revision already exists; edit or discard it first", { revisionId: last.id });
      const [rev] = await tx
        .insert(quoteRevisions)
        .values({
          quoteId: quote.id,
          revisionNo: (last?.revisionNo ?? 0) + 1,
          status: "draft",
          subtotalMinor: calc.subtotalMinor,
          chargesMinor: calc.chargesMinor,
          discountMinor: calc.discountMinor,
          taxMinor: calc.taxMinor,
          totalMinor: calc.totalMinor,
          terms: input.terms,
          createdBy: user.userId,
        })
        .returning();
      if (!rev) throw new Error("revision insert failed");
      await tx.insert(quoteItems).values(
        costLines.map((c) => {
          const r = calc.lines[c.lineNo - 1]!;
          return {
            revisionId: rev.id,
            lineNo: c.lineNo,
            enquiryItemId: c.item.id,
            publicCode: c.item.snapshot.publicCode,
            description: c.item.snapshot.name,
            variantLabel: c.item.snapshot.variantLabel,
            quantity: c.item.quantity,
            unit: c.item.unit,
            unitPriceMinor: c.input.unitPriceMinor,
            taxRateBp: c.input.taxRateBp,
            taxMinor: r.taxMinor,
            lineTotalMinor: r.lineTotalMinor,
            inclusions: c.input.inclusions,
          };
        }),
      );
      await tx.insert(quoteRevisionCostings).values({
        revisionId: rev.id,
        costing: {
          lines: costLines.map((c) => {
            const r = calc.lines[c.lineNo - 1]!;
            return {
              lineNo: c.lineNo,
              supplierRequestItemId: null,
              supplierResponseId: c.responseId,
              vendorId: c.vendorId,
              unitCostMinor: c.unitCost,
              setupChargeMinor: c.setup,
              brandingUnitCostMinor: c.brandingUnit,
              allocatedFulfilmentMinor: c.input.allocatedFulfilmentMinor,
              lineCostMinor: r.lineCostMinor,
              lineRevenueExTaxMinor: r.lineExTaxMinor,
              marginBp: r.marginBp ?? 0,
            };
          }),
          totalCostMinor: calc.totalCostMinor,
          totalRevenueExTaxMinor: calc.preTaxTotalMinor,
          grossMarginBp: calc.grossMarginBp ?? 0,
        },
      });
      await tx.update(quotes).set({ currentRevisionId: rev.id }).where(eq(quotes.id, quote.id));
      await appendAudit(tx, {
        actorKind: "platform",
        actorId: user.userId,
        action: "quote.revision.drafted",
        entityType: "quote_revision",
        entityId: rev.id,
        after: { quoteNumber: quote.quoteNumber, revisionNo: rev.revisionNo, totalMinor: calc.totalMinor, grossMarginBp: calc.grossMarginBp, needsMarginApproval: calc.needsMarginApproval },
      });
      return { quote, revision: rev, calc, needsMarginApproval: calc.needsMarginApproval };
    },
    db,
  );
}

export async function approveQuoteRevision(actor: Actor, input: { revisionId: string; reason?: string }, db: Db = getDb()) {
  const user = requirePermission(actor, "quotes:approve");
  return withContextTransaction(
    platformContext(user),
    async (tx) => {
      const [rev] = await tx.select().from(quoteRevisions).where(eq(quoteRevisions.id, input.revisionId)).for("update");
      if (!rev) throw notFound("Revision not found");
      if (rev.status !== "draft") throw conflict(`Revision is ${rev.status}`);
      await tx.update(quoteRevisions).set({ status: "approved", approvedBy: user.userId, approvedAt: new Date() }).where(eq(quoteRevisions.id, rev.id));
      await appendAudit(tx, { actorKind: "platform", actorId: user.userId, action: "quote.revision.approved", entityType: "quote_revision", entityId: rev.id, before: { status: "draft" }, after: { status: "approved" }, reason: input.reason ?? null });
    },
    db,
  );
}

/**
 * Issue: freeze the customer document + hash, supersede any earlier issued revision,
 * move the enquiry to quoted, create a one-time access link for the contact (AC-15).
 * Margin below floor requires prior approval by a quotes:approve holder.
 */
export async function issueQuoteRevision(actor: Actor, input: { revisionId: string }, db: Db = getDb()) {
  const user = requirePermission(actor, "quotes:issue");
  return withContextTransaction(
    platformContext(user),
    async (tx) => {
      const [rev] = await tx.select().from(quoteRevisions).where(eq(quoteRevisions.id, input.revisionId)).for("update");
      if (!rev) throw notFound("Revision not found");
      if (!["draft", "approved"].includes(rev.status)) throw conflict(`Revision is ${rev.status}`);
      const costing = await tx.query.quoteRevisionCostings.findFirst({ where: eq(quoteRevisionCostings.revisionId, rev.id) });
      const floor = await marginFloorBp(tx);
      if (rev.status === "draft" && (costing?.costing.grossMarginBp ?? 0) < floor && !user.permissions.has("quotes:approve")) {
        throw forbidden(`Margin is below the ${floor / 100}% floor; approval is required before issue`);
      }
      const [quote] = await tx.select().from(quotes).where(eq(quotes.id, rev.quoteId)).for("update");
      if (!quote) throw notFound("Quote not found");
      const enquiry = await tx.query.enquiries.findFirst({ where: eq(enquiries.id, quote.enquiryId) });
      const contact = enquiry ? await tx.query.contacts.findFirst({ where: eq(contacts.id, enquiry.contactId) }) : null;
      if (!enquiry || !contact) throw notFound("Enquiry not found");
      const items = await tx.select().from(quoteItems).where(eq(quoteItems.revisionId, rev.id)).orderBy(asc(quoteItems.lineNo));
      const terms = rev.terms as QuoteTermsSnapshot;
      const issuedAt = new Date();
      const validUntil = new Date(issuedAt.getTime() + terms.validityDays * 86_400_000);

      const document: QuoteCustomerDocument = {
        quoteNumber: quoteRevisionNumber(quote.quoteNumber, rev.revisionNo),
        revisionNo: rev.revisionNo,
        issuedAt: issuedAt.toISOString(),
        validUntil: validUntil.toISOString(),
        currency: "INR",
        customer: { companyName: contact.companyName, contactName: contact.name },
        lines: items.map((i) => ({
          lineNo: i.lineNo,
          publicCode: i.publicCode,
          description: i.description,
          variantLabel: i.variantLabel,
          quantity: i.quantity,
          unit: i.unit as "item" | "kit",
          unitPriceMinor: i.unitPriceMinor,
          taxRateBp: i.taxRateBp,
          taxMinor: i.taxMinor,
          lineTotalMinor: i.lineTotalMinor,
          inclusions: i.inclusions,
        })),
        charges: [],
        discountMinor: rev.discountMinor,
        subtotalMinor: rev.subtotalMinor,
        taxMinor: rev.taxMinor,
        totalMinor: rev.totalMinor,
        terms,
      };
      const documentHash = createHash("sha256").update(JSON.stringify(document)).digest("hex");

      // Supersede earlier issued/viewed revisions of this family.
      const earlier = await tx
        .select({ id: quoteRevisions.id, status: quoteRevisions.status })
        .from(quoteRevisions)
        .where(and(eq(quoteRevisions.quoteId, quote.id), sql`${quoteRevisions.status} in ('issued','viewed','revision_requested')`));
      for (const e of earlier) {
        await tx.update(quoteRevisions).set({ status: "superseded", supersededByRevisionId: rev.id }).where(eq(quoteRevisions.id, e.id));
        await appendAudit(tx, { actorKind: "platform", actorId: user.userId, action: "quote.revision.superseded", entityType: "quote_revision", entityId: e.id, before: { status: e.status }, after: { status: "superseded", supersededBy: rev.id } });
      }
      await tx
        .update(quoteRevisions)
        .set({ status: "issued", customerDocument: document, documentHash, issuedAt, issuedBy: user.userId, validUntil })
        .where(eq(quoteRevisions.id, rev.id));
      await tx.update(quotes).set({ currentRevisionId: rev.id }).where(eq(quotes.id, quote.id));
      if (enquiry.status === "sourcing" || enquiry.status === "qualified" || enquiry.status === "submitted") {
        if (enquiry.status === "submitted") await transitionEnquiryTx(tx, user.userId, { enquiryId: enquiry.id, to: "qualified", reason: "Quote issued" });
        if (enquiry.status !== "sourcing") {
          const fresh = await tx.query.enquiries.findFirst({ where: eq(enquiries.id, enquiry.id) });
          if (fresh?.status === "qualified") await transitionEnquiryTx(tx, user.userId, { enquiryId: enquiry.id, to: "sourcing", reason: "Quote issued" });
        }
        await transitionEnquiryTx(tx, user.userId, { enquiryId: enquiry.id, to: "quoted", reason: `Quote ${document.quoteNumber} issued` });
      }
      // One-time, expiring access link for the contact (never the enquiry number alone).
      const token = randomToken();
      await tx.insert(quoteAccessTokens).values({ quoteId: quote.id, contactId: contact.id, tokenHash: sha256Hex(token), expiresAt: validUntil });
      await appendAudit(tx, {
        actorKind: "platform",
        actorId: user.userId,
        customerScopeId: contact.id,
        action: "quote.revision.issued",
        entityType: "quote_revision",
        entityId: rev.id,
        after: { quoteNumber: document.quoteNumber, documentHash, totalMinor: rev.totalMinor, validUntil: validUntil.toISOString() },
      });
      await appendOutbox(tx, { type: "quote.issued", entityType: "quote_revision", entityId: rev.id, payload: { quoteId: quote.id, contactId: contact.id, accessToken: token } });
      return { quoteId: quote.id, revisionId: rev.id, quoteNumber: document.quoteNumber, documentHash, validUntil, accessToken: token };
    },
    db,
  );
}

/* ---------- Buyer access ---------- */

export type QuoteAccess = { kind: "user"; actor: AuthenticatedActor } | { kind: "token"; token: string; requestId: string };

async function resolveQuoteAccess(tx: Tx, access: QuoteAccess, quoteId: string): Promise<{ contactId: string; userId: string | null; method: "session" | "one_time_link" }> {
  const quote = await tx.query.quotes.findFirst({ where: eq(quotes.id, quoteId) });
  if (!quote) throw notFound("Quote not found");
  const enquiry = await tx.query.enquiries.findFirst({ where: eq(enquiries.id, quote.enquiryId) });
  if (!enquiry) throw notFound("Quote not found");
  if (access.kind === "user") {
    if (enquiry.buyerUserId !== access.actor.userId) throw notFound("Quote not found");
    return { contactId: enquiry.contactId, userId: access.actor.userId, method: "session" };
  }
  const [t] = await tx
    .select()
    .from(quoteAccessTokens)
    .where(and(eq(quoteAccessTokens.quoteId, quoteId), eq(quoteAccessTokens.tokenHash, sha256Hex(access.token)), isNull(quoteAccessTokens.revokedAt), gt(quoteAccessTokens.expiresAt, sql`now()`)))
    .for("update");
  if (!t) throw notFound("Quote link is invalid or has expired");
  await tx.update(quoteAccessTokens).set({ lastUsedAt: new Date() }).where(eq(quoteAccessTokens.id, t.id));
  return { contactId: t.contactId, userId: null, method: "one_time_link" };
}

function ctxFor(access: QuoteAccess): DbContext {
  return access.kind === "user" ? buyerContext(access.actor) : { actorKind: "visitor", requestId: access.requestId };
}

/** Customer view: the frozen document of the CURRENT revision only. Never the costing. */
export async function getQuoteForCustomer(access: QuoteAccess, quoteId: string, db: Db = getDb()) {
  return withContextTransaction(
    ctxFor(access),
    async (tx) => {
      await resolveQuoteAccess(tx, access, quoteId);
      const quote = await tx.query.quotes.findFirst({ where: eq(quotes.id, quoteId) });
      if (!quote?.currentRevisionId) throw notFound("Quote not found");
      const rev = await tx.query.quoteRevisions.findFirst({ where: eq(quoteRevisions.id, quote.currentRevisionId) });
      if (!rev || !rev.customerDocument) throw notFound("Quote has not been issued");
      if (rev.status === "issued") {
        await tx.update(quoteRevisions).set({ status: "viewed" }).where(eq(quoteRevisions.id, rev.id));
        await appendAudit(tx, { actorKind: access.kind === "user" ? "buyer" : "visitor", actorId: access.kind === "user" ? access.actor.userId : null, action: "quote.revision.viewed", entityType: "quote_revision", entityId: rev.id, after: { status: "viewed" } });
      }
      const accepted = await tx.query.quoteAcceptances.findFirst({ where: eq(quoteAcceptances.revisionId, rev.id) });
      return { quoteId: quote.id, revisionId: rev.id, status: accepted ? "accepted" : rev.status, document: rev.customerDocument, documentHash: rev.documentHash, validUntil: rev.validUntil };
    },
    db,
  );
}

export const acceptQuoteSchema = z.object({ revisionId: z.string().uuid(), documentHash: z.string().length(64) });

/**
 * Acceptance is transactional against the CURRENT valid revision (AC-14): an old tab holding a
 * superseded or expired revision id is rejected with the current revision offered instead.
 */
export async function acceptQuoteRevision(access: QuoteAccess, quoteId: string, raw: unknown, db: Db = getDb()) {
  const input = acceptQuoteSchema.parse(raw);
  return withContextTransaction(
    ctxFor(access),
    async (tx) => {
      const who = await resolveQuoteAccess(tx, access, quoteId);
      const [quote] = await tx.select().from(quotes).where(eq(quotes.id, quoteId)).for("update");
      if (!quote?.currentRevisionId) throw notFound("Quote not found");
      if (quote.currentRevisionId !== input.revisionId) {
        throw new AppError("conflict", "This quote has been revised; review the current revision before accepting", { details: { currentRevisionId: quote.currentRevisionId } });
      }
      const [rev] = await tx.select().from(quoteRevisions).where(eq(quoteRevisions.id, input.revisionId)).for("update");
      if (!rev || !rev.customerDocument) throw notFound("Quote not found");
      if (!["issued", "viewed"].includes(rev.status)) throw conflict(`Quote revision is ${rev.status} and cannot be accepted`);
      if (rev.validUntil && rev.validUntil < new Date()) {
        await tx.update(quoteRevisions).set({ status: "expired" }).where(eq(quoteRevisions.id, rev.id));
        throw conflict("Quote has expired; ask for a refreshed quotation");
      }
      if (rev.documentHash !== input.documentHash) throw conflict("The document you reviewed does not match the issued quote; reload and review again");
      const [acceptance] = await tx
        .insert(quoteAcceptances)
        .values({
          revisionId: rev.id,
          acceptedByUserId: who.userId,
          acceptedByContactId: who.contactId,
          verificationMethod: who.method,
          documentHash: rev.documentHash,
          termsVersion: (rev.terms as QuoteTermsSnapshot).termsVersion,
        })
        .returning();
      await tx.update(quoteRevisions).set({ status: "accepted" }).where(eq(quoteRevisions.id, rev.id));
      await transitionEnquiryTx(tx, null, { enquiryId: quote.enquiryId, to: "accepted", reason: `Quote ${rev.customerDocument.quoteNumber} accepted by customer` });
      await appendAudit(tx, {
        actorKind: who.userId ? "buyer" : "visitor",
        actorId: who.userId,
        customerScopeId: who.contactId,
        action: "quote.revision.accepted",
        entityType: "quote_revision",
        entityId: rev.id,
        after: { acceptanceId: acceptance?.id, documentHash: rev.documentHash, method: who.method },
      });
      await appendOutbox(tx, { type: "quote.accepted", entityType: "quote_revision", entityId: rev.id, payload: { quoteId: quote.id } });
      return { acceptanceId: acceptance?.id, quoteNumber: rev.customerDocument.quoteNumber, acceptedAt: acceptance?.acceptedAt };
    },
    db,
  );
}

/* ---------- Platform reads ---------- */

export async function getQuoteForPlatform(actor: Actor, quoteId: string, db: Db = getDb()) {
  const user = requireUser(actor);
  if (!user.permissions.has("quotes:draft")) throw forbidden();
  return withContextTransaction(
    platformContext(user),
    async (tx) => {
      const quote = await tx.query.quotes.findFirst({ where: eq(quotes.id, quoteId) });
      if (!quote) throw notFound("Quote not found");
      const revisions = await tx.select().from(quoteRevisions).where(eq(quoteRevisions.quoteId, quote.id)).orderBy(desc(quoteRevisions.revisionNo));
      const withItems = [];
      for (const r of revisions) {
        const items = await tx.select().from(quoteItems).where(eq(quoteItems.revisionId, r.id)).orderBy(asc(quoteItems.lineNo));
        const costing = user.permissions.has("quotes:read_margin") ? await tx.query.quoteRevisionCostings.findFirst({ where: eq(quoteRevisionCostings.revisionId, r.id) }) : null;
        const acceptance = await tx.query.quoteAcceptances.findFirst({ where: eq(quoteAcceptances.revisionId, r.id) });
        withItems.push({ revision: r, items, costing: costing?.costing ?? null, acceptance: acceptance ?? null });
      }
      return { quote, revisions: withItems };
    },
    db,
  );
}

export async function listQuotesForPlatform(actor: Actor, db: Db = getDb()) {
  const user = requireUser(actor);
  if (!user.permissions.has("quotes:draft")) throw forbidden();
  return withContextTransaction(
    platformContext(user),
    (tx) =>
      tx
        .select({ id: quotes.id, quoteNumber: quotes.quoteNumber, enquiryId: quotes.enquiryId, enquiryReference: enquiries.reference, status: quoteRevisions.status, revisionNo: quoteRevisions.revisionNo, totalMinor: quoteRevisions.totalMinor, updatedAt: quotes.updatedAt })
        .from(quotes)
        .innerJoin(enquiries, eq(enquiries.id, quotes.enquiryId))
        .leftJoin(quoteRevisions, eq(quoteRevisions.id, quotes.currentRevisionId))
        .orderBy(desc(quotes.updatedAt)),
    db,
  );
}

export async function listMyQuotes(actor: Actor, db: Db = getDb()) {
  const user = requireUser(actor);
  return withContextTransaction(
    buyerContext(user),
    (tx) =>
      tx
        .select({ id: quotes.id, quoteNumber: quotes.quoteNumber, enquiryReference: enquiries.reference, status: quoteRevisions.status, revisionNo: quoteRevisions.revisionNo, totalMinor: quoteRevisions.totalMinor, validUntil: quoteRevisions.validUntil })
        .from(quotes)
        .innerJoin(enquiries, eq(enquiries.id, quotes.enquiryId))
        .innerJoin(quoteRevisions, eq(quoteRevisions.id, quotes.currentRevisionId))
        .where(and(eq(enquiries.buyerUserId, user.userId), sql`${quoteRevisions.issuedAt} is not null`))
        .orderBy(desc(quotes.updatedAt)),
    db,
  );
}
