import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, id, rowVersion, updatedAt } from "./_shared";
import { users } from "./identity";
import { vendors } from "./vendors";
import type { ProductContent, VariantOptions } from "./types";

export const productKindEnum = pgEnum("product_kind", ["product", "combo"]);
export const productLifecycleEnum = pgEnum("product_lifecycle", ["draft", "published", "paused", "archived"]);
export const reviewStatusEnum = pgEnum("review_status", ["draft", "submitted", "approved", "rejected", "superseded"]);
export const variantStatusEnum = pgEnum("variant_status", ["active", "discontinued"]);
export const taxonomyKindEnum = pgEnum("taxonomy_kind", ["recipient", "occasion", "material", "use_case", "budget_band"]);

export const categories = pgTable(
  "categories",
  {
    id: id(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    parentId: uuid("parent_id"),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("categories_slug_uq").on(t.slug)],
);

export const taxonomyTerms = pgTable(
  "taxonomy_terms",
  {
    id: id(),
    kind: taxonomyKindEnum("kind").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("taxonomy_terms_kind_slug_uq").on(t.kind, t.slug)],
);

export const products = pgTable(
  "products",
  {
    id: id(),
    /** CGH-P-001042 or CGH-K-000125. Public. */
    publicCode: text("public_code").notNull(),
    kind: productKindEnum("kind").notNull().default("product"),
    slug: text("slug").notNull(),
    lifecycle: productLifecycleEnum("lifecycle").notNull().default("draft"),
    primaryCategoryId: uuid("primary_category_id").references(() => categories.id),
    /** Pointer to the approved+published revision; null until first publication. */
    currentRevisionId: uuid("current_revision_id"),
    /** Vendor that proposed the product (if any). Canonical content is platform-owned regardless. */
    proposedByVendorId: uuid("proposed_by_vendor_id").references(() => vendors.id),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    rowVersion: rowVersion(),
  },
  (t) => [
    uniqueIndex("products_public_code_uq").on(t.publicCode),
    uniqueIndex("products_slug_uq").on(t.slug),
    index("products_lifecycle_idx").on(t.lifecycle, t.updatedAt),
    index("products_category_idx").on(t.primaryCategoryId, t.lifecycle),
  ],
);

export const productRevisions = pgTable(
  "product_revisions",
  {
    id: id(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    revisionNo: integer("revision_no").notNull(),
    content: jsonb("content").$type<ProductContent>().notNull(),
    reviewStatus: reviewStatusEnum("review_status").notNull().default("draft"),
    authorUserId: uuid("author_user_id")
      .notNull()
      .references(() => users.id),
    /** Set when the author acted as a vendor manager; the vendor may read its own proposals. */
    authorVendorId: uuid("author_vendor_id").references(() => vendors.id),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewerUserId: uuid("reviewer_user_id").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewReason: text("review_reason"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("product_revisions_no_uq").on(t.productId, t.revisionNo),
    index("product_revisions_status_idx").on(t.reviewStatus, t.submittedAt),
  ],
);

export const productCategories = pgTable(
  "product_categories",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
  },
  (t) => [primaryKey({ columns: [t.productId, t.categoryId] })],
);

export const productTerms = pgTable(
  "product_terms",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    termId: uuid("term_id")
      .notNull()
      .references(() => taxonomyTerms.id),
  },
  (t) => [primaryKey({ columns: [t.productId, t.termId] }), index("product_terms_term_idx").on(t.termId)],
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: id(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    /** CGH-P-001042-NV-750 — platform SKU, unique platform-wide. */
    sku: text("sku").notNull(),
    label: text("label").notNull(),
    options: jsonb("options").$type<VariantOptions>().notNull().default({}),
    status: variantStatusEnum("status").notNull().default("active"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    rowVersion: rowVersion(),
  },
  (t) => [uniqueIndex("product_variants_sku_uq").on(t.sku), index("product_variants_product_idx").on(t.productId, t.status)],
);

export const productMedia = pgTable(
  "product_media",
  {
    id: id(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    /** Public delivery URL from the media adapter. Filenames must never carry vendor codes. */
    url: text("url").notNull(),
    altText: text("alt_text").notNull(),
    width: integer("width"),
    height: integer("height"),
    sortOrder: integer("sort_order").notNull().default(0),
    isHero: boolean("is_hero").notNull().default(false),
    approved: boolean("approved").notNull().default(false),
    uploadedBy: uuid("uploaded_by").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index("product_media_product_idx").on(t.productId, t.approved, t.sortOrder)],
);

/** Public-safe supply projection. The storefront reads this, never vendor_offers. */
export const productSupplySummaries = pgTable("product_supply_summaries", {
  productId: uuid("product_id")
    .primaryKey()
    .references(() => products.id),
  minMoq: integer("min_moq"),
  leadTimeDaysMin: integer("lead_time_days_min"),
  leadTimeDaysMax: integer("lead_time_days_max"),
  /** fresh | stale | unknown | made_to_order */
  stockState: text("stock_state").notNull().default("unknown"),
  activeOfferCount: integer("active_offer_count").notNull().default(0),
  updatedAt: updatedAt(),
});

export const slugRedirects = pgTable(
  "slug_redirects",
  {
    id: id(),
    fromPath: text("from_path").notNull(),
    toPath: text("to_path").notNull(),
    reason: text("reason"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("slug_redirects_from_uq").on(t.fromPath)],
);

/* ---------- Combos (fixed, P0) ---------- */

export const comboRevisions = pgTable(
  "combo_revisions",
  {
    id: id(),
    comboProductId: uuid("combo_product_id")
      .notNull()
      .references(() => products.id),
    revisionNo: integer("revision_no").notNull(),
    comboType: text("combo_type").notNull().default("fixed"),
    packaging: jsonb("packaging").$type<{ name: string; dimensionsMm?: [number, number, number]; notes?: string }>(),
    /** "assembled" | "separate" */
    assemblyMode: text("assembly_mode").notNull().default("assembled"),
    isCurrent: boolean("is_current").notNull().default(false),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("combo_revisions_no_uq").on(t.comboProductId, t.revisionNo)],
);

export const comboComponents = pgTable(
  "combo_components",
  {
    id: id(),
    comboRevisionId: uuid("combo_revision_id")
      .notNull()
      .references(() => comboRevisions.id),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id),
    unitsPerKit: integer("units_per_kit").notNull().default(1),
    required: boolean("required").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("combo_components_revision_idx").on(t.comboRevisionId)],
);
