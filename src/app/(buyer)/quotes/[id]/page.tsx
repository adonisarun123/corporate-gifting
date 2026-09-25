import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getActor, getRequestId } from "@/lib/auth/session";
import { getQuoteForCustomer, type QuoteAccess } from "@/modules/quotes/service";
import { isAuthenticated } from "@/modules/identity/actor";
import { isAppError } from "@/lib/errors";
import { QuoteDocument } from "@/components/quotes/quote-document";
import { AcceptQuote } from "@/components/quotes/accept-quote";
import { StatusBadge } from "@/components/ui/status-badge";

export const metadata: Metadata = { title: "Your quotation", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Secure quote access: signed-in buyer, or the expiring one-time link (?t=). The enquiry number alone never grants access. */
export default async function QuotePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const { id } = await params;
  const { t } = await searchParams;
  const requestId = await getRequestId();
  let access: QuoteAccess;
  if (t) access = { kind: "token", token: t, requestId };
  else {
    const actor = await getActor();
    if (!isAuthenticated(actor)) {
      return <div className="card mx-auto max-w-md p-6"><h1 className="text-xl font-bold">Sign in or use your quote link</h1><p className="mt-2 text-sm text-ink-muted">Open the secure link from your quotation e-mail, or sign in to the account that submitted the enquiry.</p></div>;
    }
    access = { kind: "user", actor };
  }
  let q;
  try {
    q = await getQuoteForCustomer(access, id);
  } catch (e) {
    if (isAppError(e) && e.code === "not_found") notFound();
    throw e;
  }
  const acceptable = q.status === "issued" || q.status === "viewed";
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-2xl font-bold">Quotation {q.document.quoteNumber}</h1><StatusBadge status={q.status} /></div>
      <QuoteDocument d={q.document} />
      {acceptable ? <AcceptQuote quoteId={q.quoteId} revisionId={q.revisionId} documentHash={q.documentHash!} token={t ?? null} /> : <p className="text-sm text-ink-muted">This revision is {q.status.replace(/_/g, " ")}.</p>}
    </div>
  );
}
