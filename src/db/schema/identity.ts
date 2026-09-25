import { index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, rowVersion, updatedAt } from "./_shared";

export const userStatusEnum = pgEnum("user_status", ["active", "suspended", "deleted"]);
export const platformRoleEnum = pgEnum("platform_role", ["owner", "admin", "sales", "catalog_editor"]);

export const users = pgTable(
  "users",
  {
    id: id(),
    authSubject: text("auth_subject").notNull(),
    displayName: text("display_name").notNull(),
    email: text("email").notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    status: userStatusEnum("status").notNull().default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    rowVersion: rowVersion(),
  },
  (t) => [uniqueIndex("users_auth_subject_uq").on(t.authSubject), uniqueIndex("users_email_uq").on(t.email)],
);

/** Explicit platform grants. Vendor scope is NOT here; see vendor_memberships. */
export const userPlatformRoles = pgTable(
  "user_platform_roles",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: platformRoleEnum("role").notNull(),
    grantedBy: uuid("granted_by").references(() => users.id),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [index("user_platform_roles_user_idx").on(t.userId, t.role)],
);

/** Personal data lives in designated tables so retention jobs can find it. */
export const contacts = pgTable(
  "contacts",
  {
    id: id(),
    userId: uuid("user_id").references(() => users.id),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    companyName: text("company_name").notNull(),
    designation: text("designation"),
    verifiedChannel: text("verified_channel"), // "email" | "phone"
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("contacts_email_idx").on(t.email), index("contacts_user_idx").on(t.userId)],
);

export const consentRecords = pgTable("consent_records", {
  id: id(),
  contactId: uuid("contact_id")
    .notNull()
    .references(() => contacts.id),
  purpose: text("purpose").notNull(), // "enquiry_processing" | "marketing"
  noticeVersion: text("notice_version").notNull(),
  granted: text("granted").notNull(), // "yes" | "no"
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Short, resumable contact verification for guest enquiries (spec §9). Codes are stored hashed. */
export const contactVerifications = pgTable(
  "contact_verifications",
  {
    id: id(),
    channel: text("channel").notNull(), // "email" | "phone"
    value: text("value").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("contact_verifications_value_idx").on(t.value, t.createdAt)],
);
