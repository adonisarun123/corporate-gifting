import type { QuoteCustomerDocument } from "@/db/schema/types";
import { formatINR } from "@/modules/pricing/money";

/** Renders the frozen customer DTO. Receives no database object, so nothing private can leak (spec §16). */
export function QuoteDocument({ d }: { d: QuoteCustomerDocument }) {
  return (
    <div className="card p-6">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div><p className="text-xs uppercase tracking-wide text-ink-muted">Quotation (not a tax invoice)</p><h2 className="text-xl font-bold">{d.quoteNumber}</h2></div>
        <dl className="text-sm"><div><dt className="inline text-ink-muted">Issued </dt><dd className="inline">{d.issuedAt ? new Date(d.issuedAt).toLocaleDateString("en-IN") : "—"}</dd></div><div><dt className="inline text-ink-muted">Valid until </dt><dd className="inline font-medium">{new Date(d.validUntil).toLocaleDateString("en-IN")}</dd></div></dl>
      </header>
      <p className="mt-4 text-sm">Prepared for <strong>{d.customer.contactName}</strong>, {d.customer.companyName}</p>
      <table className="table mt-4"><thead><tr><th>#</th><th>Item</th><th>Code</th><th className="text-right">Qty</th><th className="text-right">Unit price</th><th className="text-right">GST</th><th className="text-right">Line total</th></tr></thead>
        <tbody>{d.lines.map((l) => <tr key={l.lineNo}><td>{l.lineNo}</td><td>{l.description}{l.variantLabel && <span className="block text-xs text-ink-muted">{l.variantLabel}</span>}<span className="block text-xs text-ink-muted">{l.inclusions}</span></td><td className="text-xs">{l.publicCode}</td><td className="text-right">{l.quantity.toLocaleString("en-IN")} {l.unit === "kit" ? "kits" : "units"}</td><td className="text-right">{formatINR(l.unitPriceMinor)}</td><td className="text-right">{(l.taxRateBp / 100).toFixed(2)}%<br /><span className="text-xs">{formatINR(l.taxMinor)}</span></td><td className="text-right">{formatINR(l.lineTotalMinor)}</td></tr>)}</tbody>
        <tfoot><tr><td colSpan={6} className="text-right text-ink-muted">Subtotal (excl. GST)</td><td className="text-right">{formatINR(d.subtotalMinor)}</td></tr>
          {d.discountMinor > 0 && <tr><td colSpan={6} className="text-right text-ink-muted">Discount</td><td className="text-right">−{formatINR(d.discountMinor)}</td></tr>}
          <tr><td colSpan={6} className="text-right text-ink-muted">GST</td><td className="text-right">{formatINR(d.taxMinor)}</td></tr>
          <tr><td colSpan={6} className="text-right font-semibold">Total</td><td className="text-right font-semibold">{formatINR(d.totalMinor)}</td></tr></tfoot></table>
      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="font-medium">Payment terms</dt><dd className="text-ink-muted">{d.terms.paymentTerms}</dd></div>
        <div><dt className="font-medium">Delivery terms</dt><dd className="text-ink-muted">{d.terms.deliveryTerms}</dd></div>
        <div><dt className="font-medium">Lead-time assumptions</dt><dd className="text-ink-muted">{d.terms.leadTimeAssumptions}</dd></div>
        <div><dt className="font-medium">Inclusions</dt><dd className="text-ink-muted">{d.terms.inclusions}</dd></div>
        <div><dt className="font-medium">Quote contact</dt><dd className="text-ink-muted">{d.terms.quoteContact.name} · {d.terms.quoteContact.email}</dd></div>
        <div><dt className="font-medium">Terms version</dt><dd className="text-ink-muted">{d.terms.termsVersion}</dd></div>
      </dl>
    </div>
  );
}
