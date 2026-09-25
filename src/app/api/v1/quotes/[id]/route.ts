import { apiHandler, json } from "@/lib/api/handler";
import { getActor } from "@/lib/auth/session";
import { getQuoteForCustomer, type QuoteAccess } from "@/modules/quotes/service";
import { isAuthenticated } from "@/modules/identity/actor";
import { unauthenticated } from "@/lib/errors";

export async function quoteAccessFor(req: { nextUrl: URL }, requestId: string): Promise<QuoteAccess> {
  const token = req.nextUrl.searchParams.get("t");
  if (token) return { kind: "token", token, requestId };
  const actor = await getActor();
  if (!isAuthenticated(actor)) throw unauthenticated("Sign in or use the link from your quote e-mail");
  return { kind: "user", actor };
}

export const GET = apiHandler<{ params: Promise<{ id: string }> }>(async (req, { params, requestId }) => {
  const { id } = await params;
  return json(await getQuoteForCustomer(await quoteAccessFor(req, requestId), id));
});
