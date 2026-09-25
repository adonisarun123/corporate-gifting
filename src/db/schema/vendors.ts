import { index, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, rowVersion, updatedAt } from "./_shared";
import { users } from "./identity";

export const vendorStatusEnum = pgEnum("vendor_status", [
  "applied",
  "verifying",
  "active",
  "paused",
  "suspended",
  "archived",
]);
export const membershipRoleEnum = pgEnum("vendor_membership_role", ["manager", "owner"]);
export const membershipStatusEnum = pgEnum("vendor_membership_status", ["active", "suspended", "revoked"]);

export const vendors = pgTable(
  "vendors",
  {
    id: id(),
    /** VEN-0042 — internal, stable, never recycled, never public. */
    vendorCode: text("vendor_code").notNull(),
    legalName: text("legal_name").notNull(),
    displayName: text("display_name").notNull(),
    status: vendorStatusEnum("status").notNull().default("applied"),
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone"),
    serviceCategories: jsonb("service_categories").$type<string[]>().notNull().default([]),
    serviceableRegions: jsonb("serviceable_regions").$type<string[]>().notNull().default([]),
    settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    rowVersion: rowVersion(),
  },
  (t) => [uniqueIndex("vendors_code_uq").on(t.vendorCode), index("vendors_status_idx").on(t.status, t.updatedAt)],
);

export const vendorMemberships = pgTable(
  "vendor_memberships",
  {
    id: id(),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: membershipRoleEnum("role").notNull().default("manager"),
    status: membershipStatusEnum("status").notNull().default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("vendor_memberships_uq").on(t.vendorId, t.userId),
    index("vendor_memberships_user_idx").on(t.userId, t.status),
  ],
);

export const vendorInvitations = pgTable(
  "vendor_invitations",
  {
    id: id(),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id),
    email: text("email").notNull(),
    role: membershipRoleEnum("role").notNull().default("manager"),
    tokenHash: text("token_hash").notNull(),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("vendor_invitations_token_uq").on(t.tokenHash), index("vendor_invitations_vendor_idx").on(t.vendorId)],
);
