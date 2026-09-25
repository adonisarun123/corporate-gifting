import { apiHandler, json } from "@/lib/api/handler";
import { getActor } from "@/lib/auth/session";
import { getEnquiryForPlatform, listMyEnquiries } from "@/modules/enquiries/service";
import { isAuthenticated, isPlatformStaff } from "@/modules/identity/actor";
import { notFound, unauthenticated } from "@/lib/errors";

/** Owner (buyer) sees a summary; permitted platform staff see the workspace view. */
export const GET = apiHandler<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const { id } = await params;
  const actor = await getActor();
  if (!isAuthenticated(actor)) throw unauthenticated();
  if (isPlatformStaff(actor)) return json(await getEnquiryForPlatform(actor, id));
  const mine = (await listMyEnquiries(actor)).find((e) => e.id === id);
  if (!mine) throw notFound("Enquiry not found");
  return json(mine);
});
