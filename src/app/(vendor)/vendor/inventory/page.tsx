import { requireVendorContext } from "../context";
import { listVendorOffers } from "@/modules/supply/service";
import { adjustStockAction } from "../actions";
import { Flash } from "@/components/ui/flash";
import { AvailabilityBadge } from "@/components/catalog/availability-badge";
import { stockState } from "@/modules/pricing/rules";

export default async function VendorInventory({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { actor, membership } = await requireVendorContext();
  const offers = await listVendorOffers(actor, membership.vendorId);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Inventory</h1>
      <p className="text-sm text-ink-muted">Enter the counted on-hand figure. It is recorded as a reconciliation movement with history, and takes effect immediately after validation.</p>
      <Flash {...sp} />
      {offers.length === 0 ? <p className="text-sm text-ink-muted">No offers yet. Propose a product or add an offer under Pricing.</p> : (
        <div className="overflow-x-auto"><table className="table"><thead><tr><th>Platform SKU</th><th>Your SKU</th><th>On hand</th><th>Observed</th><th>State</th><th>Update</th></tr></thead>
          <tbody>{offers.map((o) => (
            <tr key={o.offer.id}>
              <td className="whitespace-nowrap">{o.sku}<span className="block text-xs text-ink-muted">{o.variantLabel}</span></td>
              <td>{o.offer.supplierSku}</td>
              <td className="tabular-nums">{o.onHand ?? 0}</td>
              <td className="whitespace-nowrap text-xs">{o.observedAt?.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
              <td><AvailabilityBadge state={stockState(o.observedAt ?? null, o.offer.supplyMode)} /></td>
              <td>
                <form action={adjustStockAction} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="vendorId" value={membership.vendorId} /><input type="hidden" name="offerId" value={o.offer.id} /><input type="hidden" name="expectedVersion" value={o.stockVersion ?? 1} />
                  <div><label className="sr-only" htmlFor={`oh-${o.offer.id}`}>New on-hand</label><input id={`oh-${o.offer.id}`} name="absoluteOnHand" type="number" min={0} className="input w-28" required /></div>
                  <div><label className="sr-only" htmlFor={`rs-${o.offer.id}`}>Reason</label><input id={`rs-${o.offer.id}`} name="reason" className="input w-40" placeholder="Reason (optional)" /></div>
                  <button className="btn-secondary" type="submit">Save</button>
                </form>
              </td>
            </tr>
          ))}</tbody></table></div>
      )}
    </div>
  );
}
