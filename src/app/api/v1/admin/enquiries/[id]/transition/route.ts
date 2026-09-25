import { apiHandler, json, readJson } from "@/lib/api/handler";
import { getActor } from "@/lib/auth/session";
import { transitionEnquiry } from "@/modules/enquiries/service";

export const POST = apiHandler<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  const body = (await readJson(req)) as { to: never; reason?: string; closedReason?: never };
  return json(await transitionEnquiry(await getActor(), { enquiryId: id, ...body }));
});
