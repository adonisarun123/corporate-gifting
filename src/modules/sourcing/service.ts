import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, withContextTransaction, type Db } from "@/db/client";
import {
  contacts,
  enquiries,
  enquiryItems,
  supplierRequestItems,
  supplierRequests,
  supplierResponseItems,
  supplierResponses,
  vendorOffers,
  vendors,
} from "@/db/schema";
import { businessRule, conflict, notFound } from "@/lib/errors";
import { appendAudit } from "@/modules/audit/service";
import { appendOutbox } from "@/modules/outbox/service";
import { allocateReference } from "@/modules/references/service";
import { platformContext, requirePermission, requireUser, requireVendorPermission, vendorContext, type Actor } from "@/modules/identity/actor";
import { transitionEnquiryTx } from "@/modules/enquiries/service";

export const createSupplierRequestSchema = z.object({
  enquiryId: z.string().uuid(),
  vendorId: z.string().uuid(),
  items: z
    .array(z.object({ enquiryItemId: z.string().uuid(), variantId: z.string().uuid(), quantity: z.number().int().positive(), requirements: z.string().max(1000).optional() }))
    .min(1)
    .max(50),
  dueAt: z.coerce.date(),
  message: z.string().max(2000).optional(),
  /** Explicit release of customer fields to this vendor; default none (spec §10). */
  releasedFields: z.array(z.enum(["companyName"])).default([]),
});

/**
 * Admin asks one vendor to confirm a subset of lines. The request carries only the assigned
 * requirements, delivery region and dates — never the customer's identity unless released (AC-13).
 */
export async function createSupplierRequest(actor: Actor, raw: unknown, db: Db = getDb()) {
  const user = requirePermission(actor, "sourcing:request");
  const input = createSupplierRequestSchema.parse(raw);
  return withContextTransaction(
    platformContext(user),
    async (tx) => {
      const enquiry = await tx.query.enquiries.findFirst({ where: eq(enquiries.id, input.enquiryId) });
      if (!enquiry) throw notFound("Enquiry not found");
      const vendor = await tx.query.vendors.findFirst({ where: eq(vendors.id, input.vendorId) });
      if (!vendor || vendor.status !== "active") throw businessRule("Vendor is not active for sourcing");
      const lines = await tx.select().from(enquiryItems).where(and(eq(enquiryItems.enquiryId, enquiry.id), inArray(enquiryItems.id, input.items.map((i) => i.enquiryItemId))));
      if (lines.length !== input.items.length) throw businessRule("One or more lines do not belong to this enquiry");
      // The vendor must actually supply each requested variant.
      const offers = await tx.select({ variantId: vendorOffers.variantId }).from(vendorOffers).where(and(eq(vendorOffers.vendorId, vendor.id), eq(vendorOffers.status, "active")));
      const supplied = new Set(offers.map((o) => o.variantId));
      for (const i of input.items) if (!supplied.has(i.variantId)) throw businessRule("Vendor has no active offer for a requested variant", { variantId: [i.variantId] });

      const reference = await allocateReference(tx, "supplier_request");
      const [req] = await tx
        .insert(supplierRequests)
        .values({
          enquiryId: enquiry.id,
          vendorId: vendor.id,
          reference,
          status: "sent",
          dueAt: input.dueAt,
          deliveryRegion: `${enquiry.destination.city ?? ""} ${enquiry.destination.postalCode.slice(0, 3)}xxx`.trim(),
          neededByDate: enquiry.requestedDeliveryDate,
          message: input.message ?? null,
          releasedFields: input.releasedFields,
          createdBy: user.userId,
          sentAt: new Date(),
        })
        .returning();
      if (!req) throw new Error("supplier request insert failed");
      await tx.insert(supplierRequestItems).values(
        input.items.map((i) => ({ requestId: req.id, vendorId: vendor.id, enquiryItemId: i.enquiryItemId, variantId: i.variantId, quantity: i.quantity, requirements: i.requirements ?? null })),
      );
      if (enquiry.status === "submitted") await transitionEnquiryTx(tx, user.userId, { enquiryId: enquiry.id, to: "qualified", reason: "Sourcing started" });
      if (enquiry.status === "submitted" || enquiry.status === "qualified") await transitionEnquiryTx(tx, user.userId, { enquiryId: enquiry.id, to: "sourcing", reason: "Supplier request sent" });
      await appendAudit(tx, {
        actorKind: "platform",
        actorId: user.userId,
        vendorScopeId: vendor.id,
        action: "sourcing.request.created",
        entityType: "supplier_request",
        entityId: req.id,
        after: { reference, enquiryId: enquiry.id, lineCount: input.items.length, releasedFields: input.releasedFields },
      });
      await appendOutbox(tx, { type: "sourcing.request.sent", entityType: "supplier_request", entityId: req.id, payload: { vendorId: vendor.id } });
      return req;
    },
    db,
  );
}

/** Vendor view: assigned requests only (RLS + explicit scope). No customer identity unless released. */
export async function listVendorRequests(actor: Actor, vendorId: string, db: Db = getDb()) {
  const user = requireUser(actor);
  const scope = requireVendorPermission(actor, vendorId, "request:read");
  return withContextTransaction(
    vendorContext(user, scope),
    (tx) => tx.select().from(supplierRequests).where(eq(supplierRequests.vendorId, scope.vendorId)).orderBy(desc(supplierRequests.createdAt)),
    db,
  );
}

export async function getVendorRequest(actor: Actor, vendorId: string, requestId: string, db: Db = getDb()) {
  const user = requireUser(actor);
  const scope = requireVendorPermission(actor, vendorId, "request:read");
  return withContextTransaction(
    vendorContext(user, scope),
    async (tx) => {
      const req = await tx.query.supplierRequests.findFirst({ where: and(eq(supplierRequests.id, requestId), eq(supplierRequests.vendorId, scope.vendorId)) });
      if (!req) throw notFound("Request not found");
      const items = await tx
        .select({
          id: supplierRequestItems.id,
          quantity: supplierRequestItems.quantity,
          requirements: supplierRequestItems.requirements,
          brandingSpec: supplierRequestItems.brandingSpec,
          variantId: supplierRequestItems.variantId,
          // Only the frozen public description of the line, not the customer's contact.
          line: sql<{ publicCode: string; name: string; variantLabel: string | null; configuration: unknown }>`jsonb_build_object(
            'publicCode', ${enquiryItems.snapshot}->>'publicCode', 'name', ${enquiryItems.snapshot}->>'name',
            'variantLabel', ${enquiryItems.snapshot}->>'variantLabel', 'configuration', ${enquiryItems.snapshot}->'configuration')`,
        })
        .from(supplierRequestItems)
        .innerJoin(enquiryItems, eq(enquiryItems.id, supplierRequestItems.enquiryItemId))
        .where(eq(supplierRequestItems.requestId, req.id));
      const responses = await tx.select().from(supplierResponses).where(eq(supplierResponses.requestId, req.id)).orderBy(desc(supplierResponses.versionNo));
      let released: Record<string, string> = {};
      if (req.releasedFields.includes("companyName")) {
        const e = await tx.query.enquiries.findFirst({ where: eq(enquiries.id, req.enquiryId) });
        const c = e ? await tx.query.contacts.findFirst({ where: eq(contacts.id, e.contactId) }) : null;
        if (c) released = { companyName: c.companyName };
      }
      return { request: req, items, responses, released };
    },
    db,
  );
}

export const respondSchema = z.object({
  vendorId: z.string().uuid(),
  requestId: z.string().uuid(),
  decline: z.boolean().default(false),
  validUntil: z.coerce.date().optional(),
  freightAssumptions: z.string().max(500).optional(),
  packagingAssemblyMinor: z.number().int().nonnegative().default(0),
  notes: z.string().max(2000).optional(),
  items: z
    .array(
      z.object({
        requestItemId: z.string().uuid(),
        unitCostMinor: z.number().int().nonnegative(),
        setupChargeMinor: z.number().int().nonnegative().default(0),
        brandingUnitCostMinor: z.number().int().nonnegative().default(0),
        taxTreatment: z.enum(["exclusive", "inclusive"]).default("exclusive"),
        readyQuantity: z.number().int().nonnegative().default(0),
        productionCapacity: z.number().int().nonnegative().optional(),
        leadTimeDaysMin: z.number().int().nonnegative(),
        leadTimeDaysMax: z.number().int().nonnegative(),
        dispatchDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        substitutionNote: z.string().max(500).optional(),
      }),
    )
    .default([]),
});

/** Vendor responds (versioned). Declines and partial responses are valid outcomes. */
export async function submitSupplierResponse(actor: Actor, raw: unknown, db: Db = getDb()) {
  const input = respondSchema.parse(raw);
  const user = requireUser(actor);
  const scope = requireVendorPermission(actor, input.vendorId, "request:respond");
  if (!input.decline && input.items.length === 0) throw businessRule("Provide at least one priced line or decline the request");
  return withContextTransaction(
    vendorContext(user, scope),
    async (tx) => {
      const [req] = await tx.select().from(supplierRequests).where(and(eq(supplierRequests.id, input.requestId), eq(supplierRequests.vendorId, scope.vendorId))).for("update");
      if (!req) throw notFound("Request not found");
      if (!["sent", "responded"].includes(req.status)) throw conflict(`Request is ${req.status}`);
      const reqItems = await tx.select().from(supplierRequestItems).where(eq(supplierRequestItems.requestId, req.id));
      const known = new Set(reqItems.map((i) => i.id));
      for (const i of input.items) if (!known.has(i.requestItemId)) throw businessRule("Response line does not belong to this request");
      const last = await tx.query.supplierResponses.findFirst({ where: eq(supplierResponses.requestId, req.id), orderBy: desc(supplierResponses.versionNo) });
      const [resp] = await tx
        .insert(supplierResponses)
        .values({
          requestId: req.id,
          vendorId: scope.vendorId,
          versionNo: (last?.versionNo ?? 0) + 1,
          status: input.decline ? "declined" : "submitted",
          validUntil: input.validUntil ?? null,
          freightAssumptions: input.freightAssumptions ?? null,
          packagingAssemblyMinor: input.packagingAssemblyMinor,
          notes: input.notes ?? null,
          submittedBy: user.userId,
        })
        .returning();
      if (!resp) throw new Error("response insert failed");
      if (input.items.length) {
        await tx.insert(supplierResponseItems).values(
          input.items.map((i) => ({
            responseId: resp.id,
            vendorId: scope.vendorId,
            requestItemId: i.requestItemId,
            unitCostMinor: i.unitCostMinor,
            setupChargeMinor: i.setupChargeMinor,
            brandingUnitCostMinor: i.brandingUnitCostMinor,
            taxTreatment: i.taxTreatment,
            readyQuantity: i.readyQuantity,
            productionCapacity: i.productionCapacity ?? null,
            leadTimeDaysMin: i.leadTimeDaysMin,
            leadTimeDaysMax: i.leadTimeDaysMax,
            dispatchDate: i.dispatchDate ?? null,
            substitutionNote: i.substitutionNote ?? null,
          })),
        );
      }
      await tx.update(supplierRequests).set({ status: input.decline ? "declined" : "responded", rowVersion: sql`${supplierRequests.rowVersion} + 1` }).where(eq(supplierRequests.id, req.id));
      await appendAudit(tx, {
        actorKind: "vendor",
        actorId: user.userId,
        vendorScopeId: scope.vendorId,
        action: input.decline ? "sourcing.response.declined" : "sourcing.response.submitted",
        entityType: "supplier_request",
        entityId: req.id,
        after: { responseId: resp.id, versionNo: resp.versionNo, lineCount: input.items.length },
      });
      await appendOutbox(tx, { type: "sourcing.response.received", entityType: "supplier_response", entityId: resp.id, payload: { requestId: req.id, enquiryId: req.enquiryId } });
      return resp;
    },
    db,
  );
}

/** Platform: all requests and latest responses for an enquiry, with private costs (procurement permission). */
export async function getSourcingForEnquiry(actor: Actor, enquiryId: string, db: Db = getDb()) {
  const user = requirePermission(actor, "sourcing:read_costs");
  return withContextTransaction(
    platformContext(user),
    async (tx) => {
      const reqs = await tx
        .select({ request: supplierRequests, vendorName: vendors.displayName, vendorCode: vendors.vendorCode })
        .from(supplierRequests)
        .innerJoin(vendors, eq(vendors.id, supplierRequests.vendorId))
        .where(eq(supplierRequests.enquiryId, enquiryId))
        .orderBy(desc(supplierRequests.createdAt));
      const out = [];
      for (const r of reqs) {
        const items = await tx.select().from(supplierRequestItems).where(eq(supplierRequestItems.requestId, r.request.id));
        const responses = await tx.select().from(supplierResponses).where(eq(supplierResponses.requestId, r.request.id)).orderBy(desc(supplierResponses.versionNo));
        const latest = responses[0];
        const responseItems = latest ? await tx.select().from(supplierResponseItems).where(eq(supplierResponseItems.responseId, latest.id)) : [];
        out.push({ ...r, items, responses, latestResponseItems: responseItems });
      }
      return out;
    },
    db,
  );
}
