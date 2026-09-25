import { apiHandler, json } from "@/lib/api/handler";
import { getActor } from "@/lib/auth/session";
import { listVendorRequests } from "@/modules/sourcing/service";
import { businessRule } from "@/lib/errors";

export const GET = apiHandler(async (req) => {
  const vendorId = req.nextUrl.searchParams.get("vendorId");
  if (!vendorId) throw businessRule("vendorId is required");
  return json(await listVendorRequests(await getActor(), vendorId));
});
