import { apiHandler, json, readJson } from "@/lib/api/handler";
import { getActor } from "@/lib/auth/session";
import { submitSupplierResponse } from "@/modules/sourcing/service";

export const POST = apiHandler<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  const body = (await readJson(req)) as Record<string, unknown>;
  return json(await submitSupplierResponse(await getActor(), { ...body, requestId: id }), { status: 201 });
});
