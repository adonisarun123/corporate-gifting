import { apiHandler, json, readJson } from "@/lib/api/handler";
import { getActor } from "@/lib/auth/session";
import { draftQuoteRevision, listQuotesForPlatform } from "@/modules/quotes/service";

export const GET = apiHandler(async () => json(await listQuotesForPlatform(await getActor())));
export const POST = apiHandler(async (req) => {
  const r = await draftQuoteRevision(await getActor(), await readJson(req));
  return json({ quoteId: r.quote.id, revisionId: r.revision.id, totals: { subtotalMinor: r.calc.subtotalMinor, taxMinor: r.calc.taxMinor, totalMinor: r.calc.totalMinor }, needsMarginApproval: r.needsMarginApproval }, { status: 201 });
});
