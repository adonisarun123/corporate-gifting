import { apiHandler, json, readJson } from "@/lib/api/handler";
import { getActor } from "@/lib/auth/session";
import { reviseOfferCost } from "@/modules/supply/service";

/** PATCH → new cost revision (never edits a revision in place). Requires expectedVersion. */
export const PATCH = apiHandler<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  const body = (await readJson(req)) as Record<string, unknown>;
  return json(await reviseOfferCost(await getActor(), { ...body, offerId: id }));
});
