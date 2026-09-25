import { apiHandler, json, readJson } from "@/lib/api/handler";
import { getActor } from "@/lib/auth/session";
import { rejectRevision } from "@/modules/catalog/service";

export const POST = apiHandler<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  const body = (await readJson(req)) as { reason: string };
  await rejectRevision(await getActor(), { revisionId: id, reason: body.reason });
  return json({ ok: true });
});
