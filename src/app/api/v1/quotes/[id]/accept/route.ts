import { apiHandler, json, readJson } from "@/lib/api/handler";
import { acceptQuoteRevision } from "@/modules/quotes/service";
import { quoteAccessFor } from "../route";

/** Accepts the exact revision + document hash the buyer reviewed; superseded/expired revisions are rejected. */
export const POST = apiHandler<{ params: Promise<{ id: string }> }>(async (req, { params, requestId }) => {
  const { id } = await params;
  return json(await acceptQuoteRevision(await quoteAccessFor(req, requestId), id, await readJson(req)));
});
