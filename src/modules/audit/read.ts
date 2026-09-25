import { and, desc, eq, type SQL } from "drizzle-orm";
import { getDb, withContextTransaction, type Db } from "@/db/client";
import { auditEvents } from "@/db/schema";
import { platformContext, requireUser, requireVendorPermission, vendorContext, type Actor } from "@/modules/identity/actor";
import { forbidden } from "@/lib/errors";

/**
 * Platform: audit:read sees everything. Vendor managers: redacted view of their own vendor's events
 * (RLS scopes rows; before/after payloads are stripped to field names).
 */
export async function listAuditEvents(actor: Actor, f: { entityType?: string | null; entityId?: string | null; vendorId?: string | null; limit?: number }, db: Db = getDb()) {
  const user = requireUser(actor);
  const limit = Math.min(Math.max(f.limit ?? 100, 1), 500);
  const conds: SQL[] = [];
  if (f.entityType) conds.push(eq(auditEvents.entityType, f.entityType));
  if (f.entityId) conds.push(eq(auditEvents.entityId, f.entityId));
  if (user.permissions.has("audit:read")) {
    if (f.vendorId) conds.push(eq(auditEvents.vendorScopeId, f.vendorId));
    return withContextTransaction(platformContext(user), (tx) => tx.select().from(auditEvents).where(conds.length ? and(...conds) : undefined).orderBy(desc(auditEvents.occurredAt)).limit(limit), db);
  }
  if (!f.vendorId) throw forbidden();
  const scope = requireVendorPermission(actor, f.vendorId, "offer:read");
  const rows = await withContextTransaction(vendorContext(user, scope), (tx) => tx.select().from(auditEvents).where(and(eq(auditEvents.vendorScopeId, scope.vendorId), ...conds)).orderBy(desc(auditEvents.occurredAt)).limit(limit), db);
  return rows.map((r) => ({ ...r, before: r.before ? Object.keys(r.before) : null, after: r.after ? Object.keys(r.after) : null, requestId: null, correlationId: null }));
}
