import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth/session";
import { isAuthenticated, type AuthenticatedActor, type VendorMembershipView } from "@/modules/identity/actor";

/** Resolves the acting vendor from the user's own memberships; ?vendor= only selects among them. */
export async function requireVendorContext(selected?: string): Promise<{ actor: AuthenticatedActor; membership: VendorMembershipView; memberships: VendorMembershipView[] }> {
  const actor = await getActor();
  if (!isAuthenticated(actor)) redirect("/sign-in?next=/vendor/dashboard");
  const active = actor.memberships.filter((m) => m.status === "active");
  if (active.length === 0) redirect("/account?error=no-vendor");
  const membership = active.find((m) => m.vendorId === selected) ?? active[0]!;
  return { actor, membership, memberships: active };
}
