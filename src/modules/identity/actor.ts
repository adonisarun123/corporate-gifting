import type { Permission, PlatformRole, VendorPermission } from "@/lib/permissions/matrix";
import { permissionsForRoles, VENDOR_ROLE_PERMISSIONS } from "@/lib/permissions/matrix";
import { forbidden, unauthenticated } from "@/lib/errors";
import type { DbContext } from "@/db/client";

export interface VendorMembershipView {
  vendorId: string;
  vendorCode: string;
  vendorName: string;
  vendorStatus: string;
  role: "manager" | "owner";
  status: "active" | "suspended" | "revoked";
}

export interface AuthenticatedActor {
  kind: "user";
  userId: string;
  displayName: string;
  email: string;
  status: "active" | "suspended" | "deleted";
  platformRoles: PlatformRole[];
  permissions: Set<Permission>;
  memberships: VendorMembershipView[];
  requestId: string;
}

export interface VisitorActor {
  kind: "visitor";
  requestId: string;
}

export type Actor = AuthenticatedActor | VisitorActor;

export function isAuthenticated(actor: Actor): actor is AuthenticatedActor {
  return actor.kind === "user" && actor.status === "active";
}

export function requireUser(actor: Actor): AuthenticatedActor {
  if (actor.kind !== "user") throw unauthenticated();
  if (actor.status !== "active") throw forbidden("Account is not active");
  return actor;
}

export function hasPermission(actor: Actor, permission: Permission): boolean {
  return actor.kind === "user" && actor.status === "active" && actor.permissions.has(permission);
}

export function requirePermission(actor: Actor, permission: Permission): AuthenticatedActor {
  const user = requireUser(actor);
  if (!user.permissions.has(permission)) throw forbidden();
  return user;
}

export function isPlatformStaff(actor: Actor): boolean {
  return actor.kind === "user" && actor.status === "active" && actor.platformRoles.length > 0;
}

/**
 * Vendor scope is derived from trusted membership records. A vendorId supplied
 * by the client is only ever used to select among the actor's own memberships.
 */
export interface VendorScope {
  vendorId: string;
  role: "manager" | "owner";
  permissions: ReadonlySet<VendorPermission>;
}

export function requireVendorPermission(actor: Actor, vendorId: string, permission: VendorPermission): VendorScope {
  const user = requireUser(actor);
  const m = user.memberships.find((x) => x.vendorId === vendorId);
  if (!m || m.status !== "active") throw forbidden();
  if (m.vendorStatus !== "active") throw forbidden("Vendor organisation is not active");
  const perms = VENDOR_ROLE_PERMISSIONS[m.role];
  if (!perms.has(permission)) throw forbidden();
  return { vendorId: m.vendorId, role: m.role, permissions: perms };
}

export function platformContext(actor: AuthenticatedActor): DbContext {
  return { actorKind: "platform", actorId: actor.userId, requestId: actor.requestId };
}

export function vendorContext(actor: AuthenticatedActor, scope: VendorScope): DbContext {
  return { actorKind: "vendor", actorId: actor.userId, vendorId: scope.vendorId, requestId: actor.requestId };
}

export function buyerContext(actor: AuthenticatedActor): DbContext {
  return { actorKind: "buyer", actorId: actor.userId, requestId: actor.requestId };
}

export function visitorContext(requestId: string): DbContext {
  return { actorKind: "visitor", requestId };
}

export const systemContext = (requestId = "system"): DbContext => ({ actorKind: "system", requestId });

export function effectiveRole(actor: Actor): string {
  if (actor.kind !== "user") return "visitor";
  if (actor.platformRoles.length) return actor.platformRoles.join(",");
  if (actor.memberships.length) return "vendor";
  return "buyer";
}

export { permissionsForRoles };
