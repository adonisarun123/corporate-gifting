import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, currencyEnum, id, money, rowVersion, updatedAt } from "./_shared";
import { users } from "./identity";
import { vendors } from "./vendors";
import { products, productVariants } from "./catalog";
import type { PriceMode } from "./types";

export const offerStatusEnum = pgEnum("offer_status", ["draft", "active", "paused", "archived"]);
export const supplyModeEnum = pgEnum("supply_mode", ["ready_stock", "made_to_order", "mixed"]);
export const movementKindEnum = pgEnum("inventory_movement_kind", [
  "receipt",
  "issue",
  "damage",
  "return",
  "reconciliation",
  "import",
]);

/** One supplier's ability to supply one variant. Vendor-scoped (RLS). */
export const vendorOffers = pgTable(
  "vendor_offers",
  {
    id: id(),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id),
    /** Vendor's own SKU. Private. Unique within the vendor. */
    supplierSku: text("supplier_sku").notNull(),
    status: offerStatusEnum("status").notNull().default("draft"),
    moq: integer("moq").notNull(),
    quantityIncrement: integer("quantity_increment").notNull().default(1),
    supplyMode: supplyModeEnum("supply_mode").notNull().default("ready_stock"),
    currency: currencyEnum("currency").notNull().default("INR"),
    leadTimeDaysMin: integer("lead_time_days_min").notNull(),
    leadTimeDaysMax: integer("lead_time_days_max").notNull(),
    brandingCapabilities: jsonb("branding_capabilities").$type<string[]>().notNull().default([]),
    currentRevisionId: uuid("current_revision_id"),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    rowVersion: rowVersion(),
  },
  (t) => [
    uniqueIndex("vendor_offers_sku_uq").on(t.vendorId, t.supplierSku),
    uniqueIndex("vendor_offers_variant_uq").on(t.vendorId, t.variantId),
    index("vendor_offers_vendor_status_idx").on(t.vendorId, t.status, t.updatedAt),
    index("vendor_offers_variant_idx").on(t.variantId, t.status),
  ],
);

/** Immutable cost terms. A cost change = new revision, never an in-place edit. */
export const vendorOfferRevisions = pgTable(
  "vendor_offer_revisions",
  {
    id: id(),
    offerId: uuid("offer_id")
      .notNull()
      .references(() => vendorOffers.id),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id),
    revisionNo: integer("revision_no").notNull(),
    validFrom: timestamp("valid_from", { withTimezone: true }).notNull().defaultNow(),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    setupChargeMinor: money("setup_charge_minor").notNull().default(0),
    /** "per_order" | "per_design" | "per_colour" | "per_location" */
    setupChargeScope: text("setup_charge_scope").notNull().default("per_order"),
    taxTreatment: text("tax_treatment").notNull().default("exclusive"),
    notes: text("notes"),
    authorUserId: uuid("author_user_id").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("vendor_offer_revisions_no_uq").on(t.offerId, t.revisionNo)],
);

/** Procurement cost tiers. Non-overlap enforced by an EXCLUDE constraint in SQL. */
export const offerPriceTiers = pgTable(
  "offer_price_tiers",
  {
    id: id(),
    offerRevisionId: uuid("offer_revision_id")
      .notNull()
      .references(() => vendorOfferRevisions.id),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id),
    /** Inclusive lower bound. */
    minQuantity: integer("min_quantity").notNull(),
    /** Inclusive upper bound; null = open-ended. */
    maxQuantity: integer("max_quantity"),
    unitCostMinor: money("unit_cost_minor").notNull(),
  },
  (t) => [index("offer_price_tiers_revision_idx").on(t.offerRevisionId, t.minQuantity)],
);

export const inventoryBalances = pgTable(
  "inventory_balances",
  {
    id: id(),
    offerId: uuid("offer_id")
      .notNull()
      .references(() => vendorOffers.id),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id),
    onHand: integer("on_hand").notNull().default(0),
    reserved: integer("reserved").notNull().default(0),
    safetyStock: integer("safety_stock").notNull().default(0),
    /** Vendor-declared observation time; freshness policy compares against this. */
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: updatedAt(),
    rowVersion: rowVersion(),
  },
  (t) => [uniqueIndex("inventory_balances_offer_uq").on(t.offerId)],
);

/** Append-only. Absolute stock numbers become a reconciliation movement. */
export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: id(),
    offerId: uuid("offer_id")
      .notNull()
      .references(() => vendorOffers.id),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id),
    kind: movementKindEnum("kind").notNull(),
    delta: integer("delta").notNull(),
    resultingOnHand: integer("resulting_on_hand").notNull(),
    reason: text("reason"),
    reference: text("reference"),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index("inventory_movements_offer_idx").on(t.offerId, t.createdAt)],
);

/** Admin-owned public selling price / estimate rules. Never derived automatically from vendor cost. */
export const publicPriceEntries = pgTable(
  "public_price_entries",
  {
    id: id(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    variantId: uuid("variant_id").references(() => productVariants.id),
    mode: text("mode").$type<PriceMode>().notNull().default("request_quote"),
    /** Qualifying quantity for the "from" price. */
    minQuantity: integer("min_quantity").notNull().default(1),
    unitPriceMinor: money("unit_price_minor"),
    currency: currencyEnum("currency").notNull().default("INR"),
    includesTax: boolean("includes_tax").notNull().default(false),
    includesBranding: boolean("includes_branding").notNull().default(false),
    includesShipping: boolean("includes_shipping").notNull().default(false),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull().defaultNow(),
    effectiveUntil: timestamp("effective_until", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index("public_price_entries_product_idx").on(t.productId, t.effectiveFrom)],
);

/** Configurable tax treatment per product/category. No hardcoded GST rate. */
export const taxRules = pgTable("tax_rules", {
  id: id(),
  productId: uuid("product_id").references(() => products.id),
  categoryId: uuid("category_id"),
  label: text("label").notNull(),
  rateBp: integer("rate_bp").notNull(),
  jurisdiction: text("jurisdiction").notNull().default("IN"),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull().defaultNow(),
  effectiveUntil: timestamp("effective_until", { withTimezone: true }),
});
