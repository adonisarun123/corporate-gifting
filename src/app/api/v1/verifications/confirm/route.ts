import { apiHandler, json, readJson } from "@/lib/api/handler";
import { confirmEmailVerification } from "@/modules/verification/service";

export const POST = apiHandler(async (req) => json(await confirmEmailVerification(await readJson(req))));
