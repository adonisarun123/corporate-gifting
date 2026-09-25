import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, currencyEnum, id, money, rowVersion, updatedAt } from "./_shared";
import { contacts, users } from "./identity";
import { vendors } from "./vendors";
import { products, productVariants } from "./catalog";
import type {
  CartConfiguration,
  EnquiryBudget,
  EnquiryDestination,
  EnquiryItemSnapshot,
  EstimateSnapshot,
  QuoteCostingSnapshot,
  QuoteCustomerDocument,
  QuoteTermsSnapshot,
} from "./types";

/* ---------- Carts ---------- */

export const cartStatusEnum = pgEnum("cart_status", ["active", "submitted", "expired", "merged"]);

export const carts = pgTable(
  "carts",
  {
    id: id(),
    ownerUserId: uuid("owner_user_id").references(() => users.id),
    /** SHA-256 of the guest session token. The raw token lives only in an httpOnly cookie. */
    guestTokenHash: text("guest_token_hash"),
    status: cartStatusEnum("status").notNull().default("active"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    rowVersion: rowVersion(),
  },
  (t) => [index("carts_owner_idx").on(t.ownerUserId, t.status), index("carts_guest_idx").on(t.guestTokenHash, t.status)],
);

export const cartItems = pgTable(
  "cart_items",
  {
    id: id(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    variantId: uuid("variant_id").references(() => productVariants.id),
    quantity: integer("quantity").notNull(),
    /** "item" | "kit" */
    unit: text("unit").notNull().default("item"),
    configuration: jsonb("configuration").$type<CartConfiguration>().notNull().default({}),
    estimate: jsonb("estimate").$type<EstimateSnapshot | null>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    rowVersion: rowVersion(),
  },
  (t) => [index("cart_items_cart_idx").on(t.cartId)],
);

/* ---------- Enquiries ---------- */

export const enquiryStatusEnum = pgEnum("enquiry_status", [
  "submitted",
  "qualified",
  "sourcing",
  "quoted",
  "accepted",
  "order_confirmed",
  "closed",
]);
export const enquiryClosedReasonEnum = pgEnum("enquiry_closed_reason", [
  "spam",
  "duplicate",
  "no_response",
  "cancelled",
  "lost_to_competitor",
  "budget_mismatch",
  "unavailable_requirement",
]);

export const enquiries = pgTable(
  "enquiries",
  {
    id: id(),
    /** CGE-2026-001254 — customer-facing reference, not a secret. */
    reference: text("reference").notNull(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    buyerUserId: uuid("buyer_user_id").references(() => users.id),
    cartId: uuid("cart_id").references(() => carts.id),
    status: enquiryStatusEnum("status").notNull().default("submitted"),
    closedReason: enquiryClosedReasonEnum("closed_reason"),
    ownerUserId: uuid("owner_user_id").references(() => users.id),
    priority: text("priority").notNull().default("normal"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    occasion: text("occasion"),
    recipientCount: integer("recipient_count").notNull(),
    budget: jsonb("budget").$type<EnquiryBudget | null>(),
    destination: jsonb("destination").$type<EnquiryDestination>().notNull(),
    requestedDeliveryDate: date("requested_delivery_date"),
    dateIsFlexible: boolean("date_is_flexible").notNull().default(false),
    brandingNeeds: text("branding_needs"),
    notes: text("notes"),
    source: text("source").notNull().default("web"),
    processingNoticeVersion: text("processing_notice_version").notNull(),
    marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    rowVersion: rowVersion(),
  },
  (t) => [
    uniqueIndex("enquiries_reference_uq").on(t.reference),
    index("enquiries_owner_status_idx").on(t.ownerUserId, t.status, t.createdAt),
    index("enquiries_status_idx").on(t.status, t.submittedAt),
    index("enquiries_buyer_idx").on(t.buyerUserId),
    index("enquiries_contact_idx").on(t.contactId),
  ],
);

export const enquiryItems = pgTable(
  "enquiry_items",
  {
    id: id(),
    enquiryId: uuid("enquiry_id")
      .notNull()
      .references(() => enquiries.id),
    lineNo: integer("line_no").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    variantId: uuid("variant_id").references(() => productVariants.id),
    quantity: integer("quantity").notNull(),
    unit: text("unit").notNull().default("item"),
    /** Immutable. */
    snapshot: jsonb("snapshot").$type<EnquiryItemSnapshot>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("enquiry_items_line_uq").on(t.enquiryId, t.lineNo)],
);

export const enquiryHistory = pgTable(
  "enquiry_history",
  {
    id: id(),
    enquiryId: uuid("enquiry_id")
      .notNull()
      .references(() => enquiries.id),
    fromStatus: enquiryStatusEnum("from_status"),
    toStatus: enquiryStatusEnum("to_status").notNull(),
    reason: text("reason"),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index("enquiry_history_enquiry_idx").on(t.enquiryId, t.createdAt)],
);

export const enquiryNotes = pgTable(
  "enquiry_notes",
  {
    id: id(),
    enquiryId: uuid("enquiry_id")
      .notNull()
      .references(() => enquiries.id),
    /** "internal" | "customer" */
    visibility: text("visibility").notNull().default("internal"),
    body: text("body").notNull(),
    authorUserId: uuid("author_user_id").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index("enquiry_notes_enquiry_idx").on(t.enquiryId, t.createdAt)],
);

/* ---------- Supplier requests (vendor-scoped, RLS) ---------- */

export const supplierRequestStatusEnum = pgEnum("supplier_request_status", [
  "draft",
  "sent",
  "responded",
  "declined",
  "expired",
  "closed",
]);

export const supplierRequests = pgTable(
  "supplier_requests",
  {
    id: id(),
    enquiryId: uuid("enquiry_id")
      .notNull()
      .references(() => enquiries.id),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id),
    reference: text("reference").notNull(),
    status: supplierRequestStatusEnum("status").notNull().default("draft"),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    /** Delivery region only — never the customer's identity unless released. */
    deliveryRegion: text("delivery_region").notNull(),
    neededByDate: date("needed_by_date"),
    message: text("message"),
    /** Explicitly released customer fields, e.g. ["companyName"]. Default none. */
    releasedFields: jsonb("released_fields").$type<string[]>().notNull().default([]),
    createdBy: uuid("created_by").references(() => users.id),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    rowVersion: rowVersion(),
  },
  (t) => [
    uniqueIndex("supplier_requests_reference_uq").on(t.reference),
    index("supplier_requests_vendor_idx").on(t.vendorId, t.status, t.dueAt),
    index("supplier_requests_enquiry_idx").on(t.enquiryId),
  ],
);

export const supplierRequestItems = pgTable(
  "supplier_request_items",
  {
    id: id(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => supplierRequests.id),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id),
    enquiryItemId: uuid("enquiry_item_id")
      .notNull()
      .references(() => enquiryItems.id),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id),
    quantity: integer("quantity").notNull(),
    brandingSpec: jsonb("branding_spec").$type<Record<string, unknown>>().notNull().default({}),
    requirements: text("requirements"),
  },
  (t) => [index("supplier_request_items_request_idx").on(t.requestId)],
);

export const supplierResponses = pgTable(
  "supplier_responses",
  {
    id: id(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => supplierRequests.id),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id),
    versionNo: integer("version_no").notNull(),
    /** "submitted" | "declined" */
    status: text("status").notNull().default("submitted"),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    freightAssumptions: text("freight_assumptions"),
    packagingAssemblyMinor: money("packaging_assembly_minor").notNull().default(0),
    notes: text("notes"),
    submittedBy: uuid("submitted_by").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("supplier_responses_version_uq").on(t.requestId, t.versionNo)],
);

export const supplierResponseItems = pgTable(
  "supplier_response_items",
  {
    id: id(),
    responseId: uuid("response_id")
      .notNull()
      .references(() => supplierResponses.id),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id),
    requestItemId: uuid("request_item_id")
      .notNull()
      .references(() => supplierRequestItems.id),
    unitCostMinor: money("unit_cost_minor").notNull(),
    setupChargeMinor: money("setup_charge_minor").notNull().default(0),
    brandingUnitCostMinor: money("branding_unit_cost_minor").notNull().default(0),
    taxTreatment: text("tax_treatment").notNull().default("exclusive"),
    readyQuantity: integer("ready_quantity").notNull().default(0),
    productionCapacity: integer("production_capacity"),
    leadTimeDaysMin: integer("lead_time_days_min").notNull(),
    leadTimeDaysMax: integer("lead_time_days_max").notNull(),
    dispatchDate: date("dispatch_date"),
    substitutionNote: text("substitution_note"),
  },
  (t) => [index("supplier_response_items_response_idx").on(t.responseId)],
);

/* ---------- Quotes ---------- */

export const quoteRevisionStatusEnum = pgEnum("quote_revision_status", [
  "draft",
  "approved",
  "issued",
  "viewed",
  "revision_requested",
  "accepted",
  "rejected",
  "expired",
  "superseded",
]);

export const quotes = pgTable(
  "quotes",
  {
    id: id(),
    enquiryId: uuid("enquiry_id")
      .notNull()
      .references(() => enquiries.id),
    /** CGQ-2026-000824 — the family number; revisions append -R02. */
    quoteNumber: text("quote_number").notNull(),
    currentRevisionId: uuid("current_revision_id"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("quotes_number_uq").on(t.quoteNumber), index("quotes_enquiry_idx").on(t.enquiryId)],
);

export const quoteRevisions = pgTable(
  "quote_revisions",
  {
    id: id(),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => quotes.id),
    revisionNo: integer("revision_no").notNull(),
    status: quoteRevisionStatusEnum("status").notNull().default("draft"),
    currency: currencyEnum("currency").notNull().default("INR"),
    subtotalMinor: money("subtotal_minor").notNull().default(0),
    chargesMinor: money("charges_minor").notNull().default(0),
    discountMinor: money("discount_minor").notNull().default(0),
    taxMinor: money("tax_minor").notNull().default(0),
    totalMinor: money("total_minor").notNull().default(0),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    terms: jsonb("terms").$type<QuoteTermsSnapshot>(),
    /** Frozen customer DTO at issue time. Never mutated after issue. */
    customerDocument: jsonb("customer_document").$type<QuoteCustomerDocument>(),
    documentHash: text("document_hash"),
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    issuedBy: uuid("issued_by").references(() => users.id),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    supersededByRevisionId: uuid("superseded_by_revision_id"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    rowVersion: rowVersion(),
  },
  (t) => [uniqueIndex("quote_revisions_no_uq").on(t.quoteId, t.revisionNo), index("quote_revisions_status_idx").on(t.status)],
);

export const quoteItems = pgTable(
  "quote_items",
  {
    id: id(),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => quoteRevisions.id),
    lineNo: integer("line_no").notNull(),
    enquiryItemId: uuid("enquiry_item_id").references(() => enquiryItems.id),
    publicCode: text("public_code").notNull(),
    description: text("description").notNull(),
    variantLabel: text("variant_label"),
    quantity: integer("quantity").notNull(),
    unit: text("unit").notNull().default("item"),
    unitPriceMinor: money("unit_price_minor").notNull(),
    taxRateBp: integer("tax_rate_bp").notNull().default(0),
    taxMinor: money("tax_minor").notNull().default(0),
    lineTotalMinor: money("line_total_minor").notNull(),
    inclusions: text("inclusions").notNull().default(""),
  },
  (t) => [uniqueIndex("quote_items_line_uq").on(t.revisionId, t.lineNo)],
);

/** Private. Never joined into any customer-facing DTO. */
export const quoteRevisionCostings = pgTable("quote_revision_costings", {
  revisionId: uuid("revision_id")
    .primaryKey()
    .references(() => quoteRevisions.id),
  costing: jsonb("costing").$type<QuoteCostingSnapshot>().notNull(),
  createdAt: createdAt(),
});

export const quoteAcceptances = pgTable(
  "quote_acceptances",
  {
    id: id(),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => quoteRevisions.id),
    acceptedByUserId: uuid("accepted_by_user_id").references(() => users.id),
    acceptedByContactId: uuid("accepted_by_contact_id").references(() => contacts.id),
    /** "session" | "one_time_link" */
    verificationMethod: text("verification_method").notNull(),
    documentHash: text("document_hash").notNull(),
    termsVersion: text("terms_version").notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("quote_acceptances_revision_uq").on(t.revisionId)],
);

/** Expiring, revocable one-time access to a quote for buyers without an account. */
export const quoteAccessTokens = pgTable(
  "quote_access_tokens",
  {
    id: id(),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => quotes.id),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("quote_access_tokens_hash_uq").on(t.tokenHash)],
);
