import { apiHandler, json, readJson } from "@/lib/api/handler";
import { getActor } from "@/lib/auth/session";
import { approveQuoteRevision } from "@/modules/quotes/service";

export const POST = apiHandler<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  const body = (await readJson(req).catch(() => ({}))) as { reason?: string };
  await approveQuoteRevision(await getActor(), { revisionId: id, reason: body.reason });
  return json({ ok: true });
});
