import { apiHandler, json, readJson } from "@/lib/api/handler";
import { getActor } from "@/lib/auth/session";
import { adjustStock } from "@/modules/supply/service";

export const POST = apiHandler(async (req) => json(await adjustStock(await getActor(), await readJson(req)), { status: 201 }));
