import { requireVendorContext } from "../../context";
import { getVendorRequest } from "@/modules/sourcing/service";
import { respondToRequestAction } from "../../actions";
import { Flash } from "@/components/ui/flash";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function VendorRequestDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { actor, membership } = await requireVendorContext();
  const { request, items, responses, released } = await getVendorRequest(actor, membership.vendorId, id);
  const open = request.status === "sent" || request.status === "responded";
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-2xl font-bold">Request {request.reference}</h1><StatusBadge status={request.status} /></div>
      <Flash {...sp} />
      <dl className="card grid gap-2 p-4 text-sm sm:grid-cols-2">
        <div><dt className="text-ink-muted">Respond by</dt><dd>{request.dueAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</dd></div>
        <div><dt className="text-ink-muted">Delivery region</dt><dd>{request.deliveryRegion}</dd></div>
        <div><dt className="text-ink-muted">Needed by</dt><dd>{request.neededByDate ?? "To be confirmed"}</dd></div>
        {released.companyName && <div><dt className="text-ink-muted">Customer (released)</dt><dd>{released.companyName}</dd></div>}
        {request.message && <div className="sm:col-span-2"><dt className="text-ink-muted">Message</dt><dd>{request.message}</dd></div>}
      </dl>
      {responses.length > 0 && <p className="text-sm text-ink-muted">Previous responses: {responses.map((r) => `v${r.versionNo} (${r.status})`).join(", ")}. A new submission creates the next version.</p>}
      <form action={respondToRequestAction} className="space-y-4">
        <input type="hidden" name="vendorId" value={membership.vendorId} /><input type="hidden" name="requestId" value={request.id} />
        <table className="table"><thead><tr><th>Line</th><th>Qty</th><th>Unit cost (₹)</th><th>Branding/unit (₹)</th><th>Setup (₹)</th><th>Ready qty</th><th>Lead time (days)</th><th>Dispatch date</th></tr></thead>
          <tbody>{items.map((it, i) => (
            <tr key={it.id}>
              <td><input type="hidden" name={`items.${i}.requestItemId`} value={it.id} />{it.line.name}<span className="block text-xs text-ink-muted">{it.line.publicCode}{it.line.variantLabel ? ` · ${it.line.variantLabel}` : ""}</span>{it.requirements && <span className="block text-xs">{it.requirements}</span>}</td>
              <td className="tabular-nums">{it.quantity}</td>
              <td><input name={`items.${i}.unitCostRupees`} type="number" min={0} step="0.01" className="input w-28" aria-label="Unit cost" disabled={!open} /></td>
              <td><input name={`items.${i}.brandingUnitCostRupees`} type="number" min={0} step="0.01" className="input w-24" defaultValue={0} aria-label="Branding cost per unit" disabled={!open} /></td>
              <td><input name={`items.${i}.setupChargeRupees`} type="number" min={0} step="0.01" className="input w-24" defaultValue={0} aria-label="Setup charge" disabled={!open} /></td>
              <td><input name={`items.${i}.readyQuantity`} type="number" min={0} className="input w-24" defaultValue={0} aria-label="Ready quantity" disabled={!open} /></td>
              <td className="whitespace-nowrap"><input name={`items.${i}.leadTimeDaysMin`} type="number" min={0} className="input inline-block w-16" aria-label="Lead time min" disabled={!open} /> – <input name={`items.${i}.leadTimeDaysMax`} type="number" min={0} className="input inline-block w-16" aria-label="Lead time max" disabled={!open} /></td>
              <td><input name={`items.${i}.dispatchDate`} type="date" className="input" aria-label="Dispatch date" disabled={!open} /></td>
            </tr>
          ))}</tbody></table>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className="label" htmlFor="validUntil">Response valid until</label><input id="validUntil" name="validUntil" type="date" className="input" disabled={!open} /></div>
          <div><label className="label" htmlFor="packagingAssemblyRupees">Packaging/assembly (₹)</label><input id="packagingAssemblyRupees" name="packagingAssemblyRupees" type="number" min={0} step="0.01" defaultValue={0} className="input" disabled={!open} /></div>
          <div><label className="label" htmlFor="freightAssumptions">Freight assumptions</label><input id="freightAssumptions" name="freightAssumptions" className="input" disabled={!open} /></div>
          <div className="sm:col-span-3"><label className="label" htmlFor="notes">Notes / substitutions</label><textarea id="notes" name="notes" className="input" rows={2} disabled={!open} /></div>
        </div>
        {open ? (
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" type="submit">Submit response</button>
            <button className="btn-danger" type="submit" name="decline" value="true">Decline request</button>
          </div>
        ) : <p className="text-sm text-ink-muted">This request is {request.status}; no further responses can be submitted.</p>}
      </form>
    </div>
  );
}
