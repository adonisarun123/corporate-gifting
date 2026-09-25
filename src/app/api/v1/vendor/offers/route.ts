import { apiHandler, json, readJson } from "@/lib/api/handler";
import { getActor } from "@/lib/auth/session";
import { createOffer, listVendorOffers } from "@/modules/supply/service";
import { businessRule } from "@/lib/errors";

export const GET = apiHandler(async (req) => {
  const vendorId = req.nextUrl.searchParams.get("vendorId");
  if (!vendorId) throw businessRule("vendorId is required");
  return json(await listVendorOffers(await getActor(), vendorId));
});

export const POST = apiHandler(async (req) => json(await createOffer(await getActor(), await readJson(req)), { status: 201 }));
