import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth/session";
import { isAuthenticated, isPlatformStaff, type AuthenticatedActor } from "@/modules/identity/actor";

export async function requireStaff(): Promise<AuthenticatedActor> {
  const actor = await getActor();
  if (!isAuthenticated(actor)) redirect("/sign-in?next=/admin/dashboard");
  if (!isPlatformStaff(actor)) redirect("/account?error=not-staff");
  return actor;
}
