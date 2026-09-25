import { apiHandler, json, readJson } from "@/lib/api/handler";
import { getActor } from "@/lib/auth/session";
import { approveAndPublishRevision } from "@/modules/catalog/service";

export const POST = apiHandler<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  const body = (await readJson(req).catch(() => ({}))) as { reason?: string };
  return json(await approveAndPublishRevision(await getActor(), { revisionId: id, reason: body.reason }));
});
