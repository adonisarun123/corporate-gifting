/**
 * Named permissions and the platform role → permission map (spec §3).
 * Vendor-scoped permissions are granted by active vendor_memberships, not platform roles.
 * The matrix is code so it is reviewed, versioned and unit-tested.
 */

export const PERMISSIONS = [
  // catalogue
  "catalog:read_private",
  "catalog:edit",
  "catalog:approve",
  "catalog:publish",
  "catalog:set_public_price",
  // vendors
  "vendors:manage",
  "vendors:read",
  "vendors:read_costs",
  "vendors:override_supply",
  // enquiries & sourcing
  "enquiries:read_all",
  "enquiries:read_assigned",
  "enquiries:manage",
  "sourcing:request",
  "sourcing:read_costs",
  // quotes
  "quotes:draft",
  "quotes:approve",
  "quotes:issue",
  "quotes:read_margin",
  // platform
  "audit:read",
  "audit:export",
  "roles:manage",
  "settings:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];
export type PlatformRole = "owner" | "admin" | "sales" | "catalog_editor";

const ADMIN: Permission[] = [
  "catalog:read_private",
  "catalog:edit",
  "catalog:approve",
  "catalog:publish",
  "catalog:set_public_price",
  "vendors:manage",
  "vendors:read",
  "vendors:read_costs",
  "vendors:override_supply",
  "enquiries:read_all",
  "enquiries:read_assigned",
  "enquiries:manage",
  "sourcing:request",
  "sourcing:read_costs",
  "quotes:draft",
  "quotes:approve",
  "quotes:issue",
  "quotes:read_margin",
  "audit:read",
  "audit:export",
];

export const ROLE_PERMISSIONS: Record<PlatformRole, ReadonlySet<Permission>> = {
  owner: new Set<Permission>([...ADMIN, "roles:manage", "settings:manage"]),
  admin: new Set<Permission>(ADMIN),
  sales: new Set<Permission>([
    "catalog:read_private",
    "vendors:read",
    "enquiries:read_assigned",
    "enquiries:manage",
    "sourcing:request",
    "sourcing:read_costs",
    "quotes:draft",
    "quotes:read_margin",
  ]),
  catalog_editor: new Set<Permission>(["catalog:read_private", "catalog:edit", "catalog:approve", "catalog:publish", "vendors:read"]),
};

/** Vendor membership role → what a vendor user may do within its own vendor. */
export const VENDOR_PERMISSIONS = [
  "offer:read",
  "offer:write",
  "inventory:write",
  "product:propose",
  "request:read",
  "request:respond",
  "vendor:invite",
  "vendor:settings",
] as const;
export type VendorPermission = (typeof VENDOR_PERMISSIONS)[number];

export const VENDOR_ROLE_PERMISSIONS: Record<"manager" | "owner", ReadonlySet<VendorPermission>> = {
  manager: new Set<VendorPermission>(["offer:read", "offer:write", "inventory:write", "product:propose", "request:read", "request:respond"]),
  owner: new Set<VendorPermission>([...VENDOR_PERMISSIONS]),
};

export function permissionsForRoles(roles: readonly PlatformRole[]): Set<Permission> {
  const out = new Set<Permission>();
  for (const r of roles) for (const p of ROLE_PERMISSIONS[r]) out.add(p);
  return out;
}
