import Link from "next/link";
import { requireStaff } from "../../context";
import { getQuoteForPlatform } from "@/modules/quotes/service";
import { approveQuoteAction, issueQuoteAction } from "../../actions";
import { Flash } from "@/components/ui/flash";
import { StatusBadge } from "@/components/ui/status-badge";
import { QuoteDocument } from "@/components/quotes/quote-document";
import { formatINR } from "@/modules/pricing/money";

export default async function AdminQuoteDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const actor = await requireStaff();
  const { quote, revisions } = await getQuoteForPlatform(actor, id);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Quote {quote.quoteNumber}</h1>
      <p className="text-sm"><Link href={`/admin/enquiries/${quote.enquiryId}`} className="text-brand underline">Back to enquiry</Link></p>
      <Flash {...sp} />
      {revisions.map(({ revision: r, items, costing, acceptance }) => (
        <section key={r.id} className="card space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">Revision R{String(r.revisionNo).padStart(2, "0")}</h2><StatusBadge status={r.status} />{r.issuedAt && <span className="text-xs text-ink-muted">issued {r.issuedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span>}{r.validUntil && <span className="text-xs text-ink-muted">valid until {r.validUntil.toLocaleDateString("en-IN")}</span>}{quote.currentRevisionId === r.id && <span className="badge-brand">current</span>}</div>
          {r.customerDocument ? <QuoteDocument d={r.customerDocument} /> : (
            <table className="table"><thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Unit price</th><th>GST</th><th>Line total</th></tr></thead>
              <tbody>{items.map((i) => <tr key={i.id}><td>{i.lineNo}</td><td>{i.description}</td><td>{i.quantity}</td><td>{formatINR(i.unitPriceMinor)}</td><td>{formatINR(i.taxMinor)}</td><td>{formatINR(i.lineTotalMinor)}</td></tr>)}</tbody>
              <tfoot><tr><td colSpan={5} className="text-right font-semibold">Total</td><td className="font-semibold">{formatINR(r.totalMinor)}</td></tr></tfoot></table>
          )}
          {costing && (
            <details className="text-sm"><summary className="cursor-pointer font-medium">Private costing and margin (staff only)</summary>
              <p className="mt-2">Total cost {formatINR(costing.totalCostMinor)} · revenue ex-tax {formatINR(costing.totalRevenueExTaxMinor)} · gross margin <strong>{(costing.grossMarginBp / 100).toFixed(2)}%</strong></p>
              <ul className="mt-1 text-xs text-ink-muted">{costing.lines.map((l) => <li key={l.lineNo}>Line {l.lineNo}: cost {formatINR(l.lineCostMinor)} (unit {formatINR(l.unitCostMinor)} + branding {formatINR(l.brandingUnitCostMinor)} + setup {formatINR(l.setupChargeMinor)} + fulfilment {formatINR(l.allocatedFulfilmentMinor)}) → margin {(l.marginBp / 100).toFixed(2)}%</li>)}</ul>
            </details>
          )}
          {acceptance && <p className="text-sm text-success">Accepted {acceptance.acceptedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} via {acceptance.verificationMethod}; document hash {acceptance.documentHash.slice(0, 12)}…</p>}
          {(r.status === "draft" || r.status === "approved") && (
            <div className="flex flex-wrap gap-2">
              {r.status === "draft" && actor.permissions.has("quotes:approve") && <form action={approveQuoteAction}><input type="hidden" name="quoteId" value={quote.id} /><input type="hidden" name="revisionId" value={r.id} /><button className="btn-secondary" type="submit">Approve</button></form>}
              {actor.permissions.has("quotes:issue") && <form action={issueQuoteAction}><input type="hidden" name="quoteId" value={quote.id} /><input type="hidden" name="revisionId" value={r.id} /><button className="btn-primary" type="submit">Issue to customer</button></form>}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
