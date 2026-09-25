import Link from "next/link";
import { requireStaff } from "../../context";
import { getEnquiryForPlatform } from "@/modules/enquiries/service";
import { getSourcingForEnquiry } from "@/modules/sourcing/service";
import { listVendors } from "@/modules/vendors/service";
import { listQuotesForPlatform } from "@/modules/quotes/service";
import { addNoteAction, createSupplierRequestAction, draftQuoteAction, transitionEnquiryAction } from "../../actions";
import { Flash } from "@/components/ui/flash";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatINR } from "@/modules/pricing/money";

export default async function AdminEnquiryDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const actor = await requireStaff();
  const canSource = actor.permissions.has("sourcing:read_costs");
  const [view, vendors, quotes] = await Promise.all([getEnquiryForPlatform(actor, id), listVendors(actor), listQuotesForPlatform(actor)]);
  const sourcing = canSource ? await getSourcingForEnquiry(actor, id) : [];
  const { enquiry: e, contact, items, history, notes, current } = view;
  const quote = quotes.find((q) => q.enquiryId === e.id);
  const responseOptions = sourcing.flatMap((s) => s.latestResponseItems.map((ri) => {
    const reqItem = s.items.find((i) => i.id === ri.requestItemId);
    return { id: ri.id, enquiryItemId: reqItem?.enquiryItemId, label: `${s.vendorName} v${s.responses[0]?.versionNo}: ${formatINR(ri.unitCostMinor)}/unit + branding ${formatINR(ri.brandingUnitCostMinor)} + setup ${formatINR(ri.setupChargeMinor)}, ${ri.leadTimeDaysMin}–${ri.leadTimeDaysMax}d` };
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-2xl font-bold">Enquiry {e.reference}</h1><StatusBadge status={e.status} /></div>
      <Flash {...sp} />

      <section className="grid gap-4 lg:grid-cols-2">
        <dl className="card grid gap-1 p-4 text-sm">
          <div><dt className="inline text-ink-muted">Company: </dt><dd className="inline font-medium">{contact?.companyName}</dd></div>
          <div><dt className="inline text-ink-muted">Contact: </dt><dd className="inline">{contact?.name} · {contact?.email}{contact?.phone ? ` · ${contact.phone}` : ""}{contact?.designation ? ` · ${contact.designation}` : ""}</dd></div>
          <div><dt className="inline text-ink-muted">Recipients: </dt><dd className="inline">{e.recipientCount}{e.occasion ? ` · ${e.occasion}` : ""}</dd></div>
          <div><dt className="inline text-ink-muted">Destination: </dt><dd className="inline">{e.destination.city ?? ""} {e.destination.postalCode}</dd></div>
          <div><dt className="inline text-ink-muted">Needed by: </dt><dd className="inline">{e.requestedDeliveryDate ?? "—"}{e.dateIsFlexible ? " (flexible)" : ""}</dd></div>
          {e.budget && <div><dt className="inline text-ink-muted">Budget: </dt><dd className="inline">{formatINR(e.budget.perRecipientMinor)} per recipient ({e.budget.includesTax ? "incl." : "excl."} GST, {e.budget.includesBranding ? "incl." : "excl."} branding)</dd></div>}
          {e.brandingNeeds && <div><dt className="inline text-ink-muted">Branding: </dt><dd className="inline">{e.brandingNeeds}</dd></div>}
          {e.notes && <div><dt className="text-ink-muted">Notes</dt><dd className="whitespace-pre-wrap">{e.notes}</dd></div>}
          <div><dt className="inline text-ink-muted">Marketing consent: </dt><dd className="inline">{e.marketingOptIn ? "yes" : "no"}</dd></div>
        </dl>
        <div className="card p-4">
          <h2 className="font-semibold">Status</h2>
          <ol className="mt-2 space-y-1 text-xs">{history.map((h) => <li key={h.id}><span className="text-ink-muted">{h.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span> · {h.fromStatus ?? "—"} → <strong>{h.toStatus}</strong>{h.reason ? ` · ${h.reason}` : ""}</li>)}</ol>
          <form action={transitionEnquiryAction} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="enquiryId" value={e.id} />
            <div><label className="label" htmlFor="to">Move to</label><select id="to" name="to" className="input w-40">{["qualified", "sourcing", "quoted", "accepted", "order_confirmed", "closed"].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select></div>
            <div><label className="label" htmlFor="closedReason">Closed reason</label><select id="closedReason" name="closedReason" className="input w-44"><option value="">—</option>{["spam", "duplicate", "no_response", "cancelled", "lost_to_competitor", "budget_mismatch", "unavailable_requirement"].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select></div>
            <div><label className="label" htmlFor="treason">Reason</label><input id="treason" name="reason" className="input w-48" /></div>
            <button className="btn-secondary" type="submit">Apply</button>
          </form>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Requirements (frozen at submission)</h2>
        <table className="table mt-2"><thead><tr><th>#</th><th>Item</th><th>Variant</th><th>Qty</th><th>Configuration</th><th>Estimate shown</th><th>Now</th></tr></thead>
          <tbody>{items.map((it) => { const c = current.find((x) => x.itemId === it.id); return (
            <tr key={it.id}><td>{it.lineNo}</td><td>{it.snapshot.name}<span className="block text-xs text-ink-muted">{it.snapshot.publicCode}</span></td><td>{it.snapshot.variantLabel ?? "—"}<span className="block text-xs text-ink-muted">{it.snapshot.variantSku}</span></td><td>{it.quantity} {it.unit}</td>
              <td className="text-xs">{it.snapshot.configuration.branding ? `Branding: ${it.snapshot.configuration.branding.method}` : "No branding"}{it.snapshot.configuration.requiredBy ? ` · by ${it.snapshot.configuration.requiredBy}` : ""}{it.snapshot.configuration.instructions ? ` · ${it.snapshot.configuration.instructions}` : ""}</td>
              <td className="text-xs">{it.snapshot.estimate?.unitPriceMinor != null ? `${formatINR(it.snapshot.estimate.unitPriceMinor)} (${it.snapshot.estimate.mode})` : "none"}</td>
              <td className="text-xs">{c?.lifecycle}{c && c.currentRevisionId !== it.snapshot.productRevisionId ? <span className="badge-warning ml-1">content changed since</span> : null}</td></tr>); })}</tbody></table>
      </section>

      {canSource && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Sourcing</h2>
          {sourcing.length > 0 && (
            <ul className="space-y-2">{sourcing.map((s) => (
              <li key={s.request.id} className="card p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2"><strong>{s.request.reference}</strong> → {s.vendorName} <span className="text-xs text-ink-muted">({s.vendorCode})</span> <StatusBadge status={s.request.status} /> <span className="text-xs text-ink-muted">due {s.request.dueAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span></div>
                {s.latestResponseItems.length > 0 && <ul className="mt-2 text-xs">{s.latestResponseItems.map((ri) => <li key={ri.id}>Unit {formatINR(ri.unitCostMinor)} · branding {formatINR(ri.brandingUnitCostMinor)}/unit · setup {formatINR(ri.setupChargeMinor)} · ready {ri.readyQuantity} · {ri.leadTimeDaysMin}–{ri.leadTimeDaysMax} days{ri.substitutionNote ? ` · ${ri.substitutionNote}` : ""}</li>)}</ul>}
                {s.responses[0]?.status === "declined" && <p className="mt-1 text-xs text-danger">Declined{s.responses[0].notes ? `: ${s.responses[0].notes}` : ""}</p>}
              </li>
            ))}</ul>
          )}
          <form action={createSupplierRequestAction} className="card space-y-3 p-4">
            <h3 className="font-semibold">Request supplier confirmation</h3>
            <input type="hidden" name="enquiryId" value={e.id} />
            <div className="grid gap-3 sm:grid-cols-3">
              <div><label className="label" htmlFor="sr-vendor">Vendor</label><select id="sr-vendor" name="vendorId" className="input" required>{vendors.filter((v) => v.status === "active").map((v) => <option key={v.id} value={v.id}>{v.displayName} ({v.vendorCode})</option>)}</select></div>
              <div><label className="label" htmlFor="sr-due">Respond by</label><input id="sr-due" name="dueAt" type="datetime-local" className="input" required /></div>
              <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="releaseCompany" /> Release company name to vendor</label>
            </div>
            <table className="table"><thead><tr><th>Include</th><th>Line</th><th>Qty to confirm</th><th>Requirements</th></tr></thead>
              <tbody>{items.filter((it) => it.variantId).map((it, i) => (
                <tr key={it.id}><td><input type="checkbox" name={`items.${i}.include`} defaultChecked aria-label={`Include line ${it.lineNo}`} /><input type="hidden" name={`items.${i}.enquiryItemId`} value={it.id} /><input type="hidden" name={`items.${i}.variantId`} value={it.variantId!} /></td>
                  <td>{it.snapshot.name} · {it.snapshot.variantLabel}</td><td><input name={`items.${i}.quantity`} type="number" min={1} defaultValue={it.quantity} className="input w-28" aria-label="Quantity" /></td><td><input name={`items.${i}.requirements`} className="input" defaultValue={it.snapshot.configuration.branding ? `Branding: ${it.snapshot.configuration.branding.method}` : ""} aria-label="Requirements" /></td></tr>
              ))}</tbody></table>
            <div><label className="label" htmlFor="sr-msg">Message to vendor</label><input id="sr-msg" name="message" className="input" /></div>
            <button className="btn-primary" type="submit">Send request</button>
          </form>
        </section>
      )}

      {actor.permissions.has("quotes:draft") && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Quote builder</h2>
          {quote && <p className="text-sm">Existing quote family <Link href={`/admin/quotes/${quote.id}`} className="text-brand underline">{quote.quoteNumber}</Link> — current revision R{String(quote.revisionNo ?? 0).padStart(2, "0")} <StatusBadge status={quote.status ?? "draft"} />. Drafting again creates the next revision.</p>}
          <form action={draftQuoteAction} className="card space-y-3 p-4">
            <input type="hidden" name="enquiryId" value={e.id} />
            <table className="table"><thead><tr><th>Line</th><th>Qty</th><th>Cost source</th><th>Manual unit cost (₹)</th><th>Fulfilment alloc. (₹)</th><th>Sell price / unit (₹)</th><th>GST %</th></tr></thead>
              <tbody>{items.map((it, i) => (
                <tr key={it.id}><td><input type="hidden" name={`lines.${i}.enquiryItemId`} value={it.id} />{it.snapshot.name}<span className="block text-xs text-ink-muted">{it.snapshot.variantLabel}</span></td><td>{it.quantity}</td>
                  <td><select name={`lines.${i}.supplierResponseItemId`} className="input w-64" aria-label="Supplier response line"><option value="">Manual cost</option>{responseOptions.filter((o) => o.enquiryItemId === it.id).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></td>
                  <td><input name={`lines.${i}.manualUnitCostRupees`} type="number" min={0} step="0.01" className="input w-28" aria-label="Manual unit cost" /></td>
                  <td><input name={`lines.${i}.allocatedFulfilmentRupees`} type="number" min={0} step="0.01" defaultValue={0} className="input w-28" aria-label="Allocated fulfilment cost" /></td>
                  <td><input name={`lines.${i}.unitPriceRupees`} type="number" min={0} step="0.01" className="input w-28" aria-label="Selling price per unit" /></td>
                  <td><input name={`lines.${i}.taxRatePct`} type="number" min={0} max={100} step="0.01" defaultValue={18} className="input w-20" aria-label="GST percent" /></td></tr>
              ))}</tbody></table>
            <div className="grid gap-3 sm:grid-cols-4">
              <div><label className="label" htmlFor="chargeLabel">Extra charge label</label><input id="chargeLabel" name="chargeLabel" className="input" placeholder="Freight" /></div>
              <div><label className="label" htmlFor="chargeRupees">Charge (₹)</label><input id="chargeRupees" name="chargeRupees" type="number" min={0} step="0.01" className="input" /></div>
              <div><label className="label" htmlFor="chargeTaxPct">Charge GST %</label><input id="chargeTaxPct" name="chargeTaxPct" type="number" min={0} step="0.01" defaultValue={18} className="input" /></div>
              <div><label className="label" htmlFor="discountRupees">Discount (₹)</label><input id="discountRupees" name="discountRupees" type="number" min={0} step="0.01" defaultValue={0} className="input" /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label" htmlFor="validityDays">Validity (days)</label><input id="validityDays" name="validityDays" type="number" min={1} max={90} defaultValue={14} className="input" /></div>
              <div><label className="label" htmlFor="termsVersion">Terms version</label><input id="termsVersion" name="termsVersion" className="input" defaultValue="T-2026-09" /></div>
              <div><label className="label" htmlFor="paymentTerms">Payment terms</label><input id="paymentTerms" name="paymentTerms" className="input" required defaultValue="50% advance with purchase order, balance before dispatch" /></div>
              <div><label className="label" htmlFor="deliveryTerms">Delivery terms</label><input id="deliveryTerms" name="deliveryTerms" className="input" required defaultValue={`Delivered to one address in ${e.destination.city ?? e.destination.postalCode}`} /></div>
              <div><label className="label" htmlFor="leadTimeAssumptions">Lead-time assumptions</label><input id="leadTimeAssumptions" name="leadTimeAssumptions" className="input" required defaultValue="Working days after artwork approval" /></div>
              <div><label className="label" htmlFor="inclusions">Inclusions</label><input id="inclusions" name="inclusions" className="input" required defaultValue="Excludes GST unless shown; custom branding as specified per line" /></div>
              <div><label className="label" htmlFor="quoteContactName">Quote contact name</label><input id="quoteContactName" name="quoteContactName" className="input" required defaultValue={actor.displayName} /></div>
              <div><label className="label" htmlFor="quoteContactEmail">Quote contact e-mail</label><input id="quoteContactEmail" name="quoteContactEmail" type="email" className="input" required defaultValue={actor.email} /></div>
            </div>
            <button className="btn-primary" type="submit">Save draft revision</button>
          </form>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold">Internal notes</h2>
        <ul className="mt-2 space-y-1 text-sm">{notes.map((n) => <li key={n.id} className="card p-2"><span className="text-xs text-ink-muted">{n.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span> · {n.body}</li>)}</ul>
        <form action={addNoteAction} className="mt-2 flex gap-2"><input type="hidden" name="enquiryId" value={e.id} /><label className="sr-only" htmlFor="note">Note</label><input id="note" name="body" className="input" required placeholder="Internal note (not visible to customer)" /><button className="btn-secondary" type="submit">Add</button></form>
      </section>
    </div>
  );
}
