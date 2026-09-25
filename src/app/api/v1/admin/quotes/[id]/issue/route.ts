import { apiHandler, json } from "@/lib/api/handler";
import { getActor } from "@/lib/auth/session";
import { issueQuoteRevision } from "@/modules/quotes/service";

/** :id is the revision id. The access token is delivered to the customer via the outbox, not returned here. */
export const POST = apiHandler<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const { id } = await params;
  const r = await issueQuoteRevision(await getActor(), { revisionId: id });
  return json({ quoteId: r.quoteId, revisionId: r.revisionId, quoteNumber: r.quoteNumber, validUntil: r.validUntil });
});
