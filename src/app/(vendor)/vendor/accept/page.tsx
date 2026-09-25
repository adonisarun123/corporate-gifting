import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth/session";
import { isAuthenticated } from "@/modules/identity/actor";
import { acceptVendorInvitation } from "@/modules/vendors/service";
import { errorMessage } from "@/lib/forms/parse";

/** Invitation acceptance: the signed-in user's e-mail must match the invitation. */
export default async function AcceptInvitation({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const actor = await getActor();
  if (!isAuthenticated(actor)) redirect(`/sign-in?next=${encodeURIComponent(`/vendor/accept?token=${token ?? ""}`)}`);
  if (!token) return <p className="field-error">Missing invitation token.</p>;
  try {
    await acceptVendorInvitation(actor, token);
  } catch (e) {
    return <div className="card p-6"><h1 className="text-xl font-bold">Invitation could not be accepted</h1><p className="mt-2 text-sm text-danger">{errorMessage(e)}</p></div>;
  }
  redirect("/vendor/dashboard?ok=Welcome");
}
