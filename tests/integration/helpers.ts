import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { withContextTransaction, type Db } from "@/db/client";
import { systemContext, type AuthenticatedActor } from "@/modules/identity/actor";
import { resolveActorByUserId } from "@/modules/identity/service";
import { randomUUID } from "node:crypto";

/** Runtime-role connection (cgh_app): what the application actually uses. RLS applies. */
export function runtimeDb(): { db: Db; pool: Pool } {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  return { db: drizzle(pool, { schema }), pool };
}

/** Owner connection for fixture setup only. */
export function ownerDb(): { db: Db; pool: Pool } {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL_DIRECT, max: 1 });
  return { db: drizzle(pool, { schema }), pool };
}

/** Uses the OWNER connection: the runtime role has no TRUNCATE privilege by design. */
export async function truncateAll() {
  const { db, pool } = ownerDb();
  await withContextTransaction(systemContext(), async (tx) => {
    const tables = [
      "quote_acceptances", "quote_access_tokens", "quote_revision_costings", "quote_items", "quote_revisions", "quotes",
      "supplier_response_items", "supplier_responses", "supplier_request_items", "supplier_requests",
      "enquiry_notes", "enquiry_history", "enquiry_items", "enquiries", "consent_records", "contact_verifications", "contacts",
      "cart_items", "carts", "inventory_movements", "inventory_balances", "offer_price_tiers", "vendor_offer_revisions", "vendor_offers",
      "public_price_entries", "tax_rules", "combo_components", "combo_revisions", "product_media", "product_terms", "product_categories",
      "product_search_documents", "product_supply_summaries", "product_variants", "product_revisions", "products", "taxonomy_terms", "categories",
      "vendor_invitations", "vendor_memberships", "vendors", "user_platform_roles", "users", "audit_events", "security_events",
      "outbox_events", "processed_events", "notification_deliveries", "idempotency_keys", "reference_counters", "system_settings", "feature_flags",
    ];
    for (const t of tables) await tx.execute(`truncate table "${t}" cascade` as never);
    await tx.execute(`insert into reference_counters (kind, period, next_value) values ('vendor','all',1),('product','all',1),('combo','all',1)` as never);
  }, db);
  await pool.end();
}

export interface Fixture {
  ownerActor: AuthenticatedActor;
  adminActor: AuthenticatedActor;
  vendorAUserId: string;
  vendorBUserId: string;
  buyerUserId: string;
  categoryId: string;
}

/** Users + roles + taxonomy. Vendors are created through the service so audit/refs are exercised. */
export async function seedBase(db: Db): Promise<Fixture> {
  const ids = await withContextTransaction(systemContext(), async (tx) => {
    const mk = async (email: string, name: string) => {
      const [u] = await tx.insert(schema.users).values({ authSubject: `dev:${email}`, email, displayName: name }).returning();
      return u!.id;
    };
    const owner = await mk("owner@test.local", "Platform Owner");
    const admin = await mk("admin@test.local", "Platform Admin");
    const va = await mk("vendor-a@test.local", "Vendor A Manager");
    const vb = await mk("vendor-b@test.local", "Vendor B Manager");
    const buyer = await mk("buyer@test.local", "Buyer One");
    await tx.insert(schema.userPlatformRoles).values([
      { userId: owner, role: "owner" },
      { userId: admin, role: "admin" },
    ]);
    const [cat] = await tx.insert(schema.categories).values({ slug: "drinkware", name: "Drinkware" }).returning();
    await tx.insert(schema.taxonomyTerms).values([
      { kind: "recipient", slug: "new-joiners", name: "New joiners" },
      { kind: "occasion", slug: "onboarding", name: "Onboarding" },
    ]);
    return { owner, admin, va, vb, buyer, categoryId: cat!.id };
  }, db);
  const ownerActor = (await resolveActorByUserId(ids.owner, randomUUID(), db))!;
  const adminActor = (await resolveActorByUserId(ids.admin, randomUUID(), db))!;
  return { ownerActor, adminActor, vendorAUserId: ids.va, vendorBUserId: ids.vb, buyerUserId: ids.buyer, categoryId: ids.categoryId };
}

export async function actorFor(db: Db, userId: string): Promise<AuthenticatedActor> {
  const a = await resolveActorByUserId(userId, randomUUID(), db);
  if (!a) throw new Error("actor not found");
  return a;
}

export async function addMembership(db: Db, vendorId: string, userId: string) {
  await withContextTransaction(systemContext(), (tx) => tx.insert(schema.vendorMemberships).values({ vendorId, userId, role: "manager", status: "active" }), db);
}

export async function auditActions(db: Db, entityId?: string): Promise<string[]> {
  return withContextTransaction(systemContext(), async (tx) => {
    const rows = entityId
      ? await tx.select({ a: schema.auditEvents.action }).from(schema.auditEvents).where(eq(schema.auditEvents.entityId, entityId)).orderBy(schema.auditEvents.occurredAt)
      : await tx.select({ a: schema.auditEvents.action }).from(schema.auditEvents).orderBy(schema.auditEvents.occurredAt);
    return rows.map((r) => r.a);
  }, db);
}
