import { apiHandler, json, readJson } from "@/lib/api/handler";
import { getActor } from "@/lib/auth/session";
import { createVendor, listVendors } from "@/modules/vendors/service";

export const GET = apiHandler(async () => json(await listVendors(await getActor())));
export const POST = apiHandler(async (req) => json(await createVendor(await getActor(), await readJson(req)), { status: 201 }));
