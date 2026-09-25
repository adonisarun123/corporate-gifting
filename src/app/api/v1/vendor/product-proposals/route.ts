import { apiHandler, json, readJson } from "@/lib/api/handler";
import { getActor } from "@/lib/auth/session";
import { proposeProduct } from "@/modules/catalog/service";

export const POST = apiHandler(async (req) => json(await proposeProduct(await getActor(), await readJson(req)), { status: 201 }));
