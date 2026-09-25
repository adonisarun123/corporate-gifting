import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb, withContextTransaction, type Db } from "@/db/client";
import { users, vendorInvitations, vendorMemberships, vendors } from "@/db/schema";
import { platformContext, requirePermission, systemContext, type Actor, type AuthenticatedActor } from "@/modules/identity/actor";
import { appendAudit } from "@/modules/audit/service";
import { appendOutbox } from "@/modules/outbox/service";
import { allocateReference } from "@/modules/references/service";
import { businessRule, forbidden, notFound } from "@/lib/errors";
import { randomToken, sha256Hex } from "@/lib/auth/signing";

export const createVendorSchema = z.object({
  legalName: z.string().min(2).max(200),
  displayName: z.string().min(2).max(120),
  contactEmail: z.string().email(),
  contactPhone: z.string().max(30).optional(),
  serviceCategories: z.array(z.string().max(60)).max(20).default([]),
  serviceableRegions: z.array(z.string().max(60)).max(50).default([]),
});
export type CreateVendorInput = z.infer<typeof createVendorSchema>;

export async function createVendor(actor: Actor, raw: unknown, db: Db = getDb()) {
  const user = requirePermission(actor, "vendors:manage");
  const input = createVendorSchema.parse(raw);
  return withContextTransaction(
    platformContext(user),
    async (tx) => {
      const vendorCode = await allocateReference(tx, "vendor");
      const [vendor] = await tx
        .insert(vendors)
        .values({ ...input, vendorCode, status: "active", createdBy: user.userId })
        .returning();
      if (!vendor) throw new Error("vendor insert failed");
      await appendAudit(tx, {
        actorKind: "platform",
        actorId: user.userId,
        vendorScopeId: vendor.id,
        action: "vendor.created",
        entityType: "vendor",
        entityId: vendor.id,
        after: { vendorCode, displayName: vendor.displayName, status: vendor.status },
      });
      return vendor;
    },
    db,
  );
}

export const inviteManagerSchema = z.object({
  vendorId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["manager", "owner"]).default("manager"),
});

/** Returns the raw token exactly once; only its hash is stored. */
export async function inviteVendorManager(actor: Actor, raw: unknown, db: Db = getDb()) {
  const user = requirePermission(actor, "vendors:manage");
  const input = inviteManagerSchema.parse(raw);
  return withContextTransaction(
    platformContext(user),
    async (tx) => {
      const vendor = await tx.query.vendors.findFirst({ where: eq(vendors.id, input.vendorId) });
      if (!vendor) throw notFound("Vendor not found");
      if (vendor.status !== "active") throw businessRule("Vendor is not active");
      const token = randomToken();
      const [inv] = await tx
        .insert(vendorInvitations)
        .values({
          vendorId: vendor.id,
          email: input.email.toLowerCase(),
          role: input.role,
          tokenHash: sha256Hex(token),
          invitedBy: user.userId,
          expiresAt: new Date(Date.now() + 7 * 86_400_000),
        })
        .returning();
      if (!inv) throw new Error("invitation insert failed");
      await appendAudit(tx, {
        actorKind: "platform",
        actorId: user.userId,
        vendorScopeId: vendor.id,
        action: "vendor.manager.invited",
        entityType: "vendor_invitation",
        entityId: inv.id,
        after: { email: inv.email, role: inv.role },
      });
      // The raw token travels only inside the outbox payload (server-side) so the e-mail can carry the link.
      await appendOutbox(tx, { type: "vendor.invited", entityType: "vendor_invitation", entityId: inv.id, payload: { vendorId: vendor.id, token } });
      return { invitation: inv, token };
    },
    db,
  );
}

/**
 * Accept an invitation: the signed-in user must match the invited e-mail.
 * Membership is created from the invitation record, never from a submitted vendorId.
 */
export async function acceptVendorInvitation(actor: AuthenticatedActor, token: string, db: Db = getDb()) {
  return withContextTransaction(
    systemContext(actor.requestId),
    async (tx) => {
      const inv = await tx.query.vendorInvitations.findFirst({
        where: and(eq(vendorInvitations.tokenHash, sha256Hex(token)), isNull(vendorInvitations.usedAt), isNull(vendorInvitations.revokedAt), gt(vendorInvitations.expiresAt, new Date())),
      });
      if (!inv) throw notFound("Invitation is invalid or has expired");
      const user = await tx.query.users.findFirst({ where: eq(users.id, actor.userId) });
      if (!user || user.email.toLowerCase() !== inv.email) throw forbidden("This invitation was sent to a different e-mail address");
      const [membership] = await tx
        .insert(vendorMemberships)
        .values({ vendorId: inv.vendorId, userId: actor.userId, role: inv.role, status: "active" })
        .onConflictDoUpdate({ target: [vendorMemberships.vendorId, vendorMemberships.userId], set: { status: "active", role: inv.role } })
        .returning();
      await tx.update(vendorInvitations).set({ usedAt: new Date() }).where(eq(vendorInvitations.id, inv.id));
      if (!membership) throw new Error("membership insert failed");
      await appendAudit(tx, {
        actorKind: "vendor",
        actorId: actor.userId,
        vendorScopeId: inv.vendorId,
        action: "vendor.invitation.accepted",
        entityType: "vendor_membership",
        entityId: membership.id,
        after: { role: membership.role, status: membership.status },
      });
      return membership;
    },
    db,
  );
}

export async function listVendors(actor: Actor, db: Db = getDb()) {
  const user = requirePermission(actor, "vendors:read");
  return withContextTransaction(platformContext(user), (tx) => tx.query.vendors.findMany({ orderBy: (v, { asc }) => [asc(v.vendorCode)] }), db);
}

export async function setVendorStatus(actor: Actor, input: { vendorId: string; status: "active" | "paused" | "suspended" | "archived"; reason: string }, db: Db = getDb()) {
  const user = requirePermission(actor, "vendors:manage");
  return withContextTransaction(
    platformContext(user),
    async (tx) => {
      const before = await tx.query.vendors.findFirst({ where: eq(vendors.id, input.vendorId) });
      if (!before) throw notFound("Vendor not found");
      const [after] = await tx.update(vendors).set({ status: input.status }).where(eq(vendors.id, input.vendorId)).returning();
      await appendAudit(tx, {
        actorKind: "platform",
        actorId: user.userId,
        vendorScopeId: input.vendorId,
        action: "vendor.status.changed",
        entityType: "vendor",
        entityId: input.vendorId,
        before: { status: before.status },
        after: { status: input.status },
        reason: input.reason,
      });
      return after;
    },
    db,
  );
}
