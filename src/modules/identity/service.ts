import { and, eq, isNull } from "drizzle-orm";
import { getDb, withContextTransaction, type Db, type Tx } from "@/db/client";
import { userPlatformRoles, users, vendorMemberships, vendors } from "@/db/schema";
import { systemContext, type AuthenticatedActor, type VendorMembershipView } from "./actor";
import { permissionsForRoles, type PlatformRole } from "@/lib/permissions/matrix";
import { appendAudit } from "@/modules/audit/service";
import { forbidden } from "@/lib/errors";

/**
 * Resolve an authenticated actor from the identity provider's subject.
 * Membership and roles come from Neon, never from the token or a submitted ID.
 */
export async function resolveActorBySubject(subject: string, requestId: string, db: Db = getDb()): Promise<AuthenticatedActor | null> {
  return withContextTransaction(
    systemContext(requestId),
    async (tx) => {
      const user = await tx.query.users.findFirst({ where: eq(users.authSubject, subject) });
      if (!user) return null;
      return buildActor(tx, user, requestId);
    },
    db,
  );
}

export async function resolveActorByUserId(userId: string, requestId: string, db: Db = getDb()): Promise<AuthenticatedActor | null> {
  return withContextTransaction(
    systemContext(requestId),
    async (tx) => {
      const user = await tx.query.users.findFirst({ where: eq(users.id, userId) });
      if (!user) return null;
      return buildActor(tx, user, requestId);
    },
    db,
  );
}

async function buildActor(tx: Tx, user: typeof users.$inferSelect, requestId: string): Promise<AuthenticatedActor> {
  const roleRows = await tx
    .select({ role: userPlatformRoles.role })
    .from(userPlatformRoles)
    .where(and(eq(userPlatformRoles.userId, user.id), isNull(userPlatformRoles.revokedAt)));
  const platformRoles = roleRows.map((r) => r.role as PlatformRole);

  const memberRows = await tx
    .select({
      vendorId: vendorMemberships.vendorId,
      role: vendorMemberships.role,
      status: vendorMemberships.status,
      vendorCode: vendors.vendorCode,
      vendorName: vendors.displayName,
      vendorStatus: vendors.status,
    })
    .from(vendorMemberships)
    .innerJoin(vendors, eq(vendors.id, vendorMemberships.vendorId))
    .where(eq(vendorMemberships.userId, user.id));

  const memberships: VendorMembershipView[] = memberRows.map((m) => ({
    vendorId: m.vendorId,
    vendorCode: m.vendorCode,
    vendorName: m.vendorName,
    vendorStatus: m.vendorStatus,
    role: m.role,
    status: m.status,
  }));

  return {
    kind: "user",
    userId: user.id,
    displayName: user.displayName,
    email: user.email,
    status: user.status,
    platformRoles,
    permissions: user.status === "active" ? permissionsForRoles(platformRoles) : new Set(),
    memberships,
    requestId,
  };
}

/** Provision a user record for a new identity-provider subject (no roles, no memberships). */
export async function ensureUser(input: { subject: string; email: string; displayName: string }, db: Db = getDb()) {
  return withContextTransaction(
    systemContext(),
    async (tx) => {
      const existing = await tx.query.users.findFirst({ where: eq(users.authSubject, input.subject) });
      if (existing) return existing;
      const [created] = await tx
        .insert(users)
        .values({ authSubject: input.subject, email: input.email.toLowerCase(), displayName: input.displayName })
        .returning();
      if (!created) throw new Error("user insert failed");
      await appendAudit(tx, {
        actorKind: "system",
        action: "identity.user.created",
        entityType: "user",
        entityId: created.id,
        after: { email: created.email },
      });
      return created;
    },
    db,
  );
}

/** Owner-only: grant a platform role. Users never grant themselves roles. */
export async function grantPlatformRole(
  actor: AuthenticatedActor,
  input: { userId: string; role: PlatformRole; reason: string },
  db: Db = getDb(),
) {
  if (!actor.permissions.has("roles:manage")) throw forbidden();
  return withContextTransaction(
    { actorKind: "platform", actorId: actor.userId, requestId: actor.requestId },
    async (tx) => {
      const [row] = await tx
        .insert(userPlatformRoles)
        .values({ userId: input.userId, role: input.role, grantedBy: actor.userId })
        .returning();
      await appendAudit(tx, {
        actorKind: "platform",
        actorId: actor.userId,
        action: "identity.role.granted",
        entityType: "user",
        entityId: input.userId,
        after: { role: input.role },
        reason: input.reason,
      });
      return row;
    },
    db,
  );
}

/** Suspension takes effect on the next protected request because every request re-resolves membership. */
export async function suspendVendorMembership(
  actor: AuthenticatedActor,
  input: { vendorId: string; userId: string; reason: string },
  db: Db = getDb(),
) {
  if (!actor.permissions.has("vendors:manage")) throw forbidden();
  return withContextTransaction(
    { actorKind: "platform", actorId: actor.userId, requestId: actor.requestId },
    async (tx) => {
      const [row] = await tx
        .update(vendorMemberships)
        .set({ status: "suspended" })
        .where(and(eq(vendorMemberships.vendorId, input.vendorId), eq(vendorMemberships.userId, input.userId)))
        .returning();
      if (!row) throw forbidden();
      await appendAudit(tx, {
        actorKind: "platform",
        actorId: actor.userId,
        vendorScopeId: input.vendorId,
        action: "identity.membership.suspended",
        entityType: "vendor_membership",
        entityId: row.id,
        before: { status: "active" },
        after: { status: "suspended" },
        reason: input.reason,
      });
      return row;
    },
    db,
  );
}
