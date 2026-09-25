import { requireVendorContext } from "../context";
import { listVendorOffers } from "@/modules/supply/service";
import { createOfferAction, reviseCostAction } from "../actions";
import { Flash } from "@/components/ui/flash";
import { formatINR } from "@/modules/pricing/money";
import { listVariantsForVendorOffers } from "@/modules/supply/variants";

export default async function VendorPricing({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { actor, membership } = await requireVendorContext();
  const [offers, variants] = await Promise.all([listVendorOffers(actor, membership.vendorId), listVariantsForVendorOffers(actor, membership.vendorId)]);
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Supply costs</h1>
      <p className="text-sm text-ink-muted">Your procurement costs and terms. Every change creates a new internal revision; the platform reviews affected quotes. Public selling prices are set by the platform, not here.</p>
      <Flash {...sp} />
      <section className="space-y-4">
        {offers.map((o) => (
          <details key={o.offer.id} className="card p-4">
            <summary className="cursor-pointer font-medium">{o.sku} · {o.variantLabel} <span className="text-xs text-ink-muted">(your SKU {o.offer.supplierSku}, MOQ {o.offer.moq}, {o.offer.leadTimeDaysMin}–{o.offer.leadTimeDaysMax} days, v{o.offer.rowVersion})</span></summary>
            <p className="mt-2 text-sm">Current tiers: {o.tiers.length ? o.tiers.sort((a, b) => a.minQuantity - b.minQuantity).map((t) => `${t.minQuantity}${t.maxQuantity ? `–${t.maxQuantity}` : "+"}: ${formatINR(t.unitCostMinor)}`).join(" · ") : "none"}</p>
            <form action={reviseCostAction} className="mt-3 grid gap-3">
              <input type="hidden" name="vendorId" value={membership.vendorId} /><input type="hidden" name="offerId" value={o.offer.id} /><input type="hidden" name="expectedVersion" value={o.offer.rowVersion} />
              {[0, 1, 2].map((i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-3">
                  <div><label className="label" htmlFor={`t${i}min-${o.offer.id}`}>Tier {i + 1} min qty</label><input id={`t${i}min-${o.offer.id}`} name={`tiers.${i}.minQuantity`} type="number" min={1} className="input" required={i === 0} /></div>
                  <div><label className="label" htmlFor={`t${i}max-${o.offer.id}`}>Max qty (blank = open)</label><input id={`t${i}max-${o.offer.id}`} name={`tiers.${i}.maxQuantity`} type="number" min={1} className="input" /></div>
                  <div><label className="label" htmlFor={`t${i}cost-${o.offer.id}`}>Unit cost (₹)</label><input id={`t${i}cost-${o.offer.id}`} name={`tiers.${i}.unitCostRupees`} type="number" min={0} step="0.01" className="input" required={i === 0} /></div>
                </div>
              ))}
              <div className="grid gap-2 sm:grid-cols-2">
                <div><label className="label" htmlFor={`setup-${o.offer.id}`}>Setup charge (₹)</label><input id={`setup-${o.offer.id}`} name="setupChargeRupees" type="number" min={0} step="0.01" defaultValue={0} className="input" /></div>
                <div><label className="label" htmlFor={`notes-${o.offer.id}`}>Reason / notes</label><input id={`notes-${o.offer.id}`} name="notes" className="input" /></div>
              </div>
              <div><button className="btn-secondary" type="submit">Save new cost revision</button></div>
            </form>
          </details>
        ))}
      </section>
      <section className="card p-4">
        <h2 className="font-semibold">Add an offer for an existing platform variant</h2>
        <p className="help mb-3">Only variants of products you proposed are listed here; association with other canonical products is requested through the platform team.</p>
        {variants.length === 0 ? <p className="text-sm text-ink-muted">No variants without an offer.</p> : (
          <form action={createOfferAction} className="grid gap-3 sm:grid-cols-3">
            <input type="hidden" name="vendorId" value={membership.vendorId} />
            <div className="sm:col-span-3"><label className="label" htmlFor="variantId">Variant</label><select id="variantId" name="variantId" className="input">{variants.map((v) => <option key={v.id} value={v.id}>{v.sku} · {v.label}</option>)}</select></div>
            <div><label className="label" htmlFor="n-sku">Your SKU</label><input id="n-sku" name="supplierSku" className="input" required /></div>
            <div><label className="label" htmlFor="n-moq">MOQ</label><input id="n-moq" name="moq" type="number" min={1} className="input" required /></div>
            <div><label className="label" htmlFor="n-inc">Increment</label><input id="n-inc" name="quantityIncrement" type="number" min={1} defaultValue={1} className="input" /></div>
            <div><label className="label" htmlFor="n-cost">Unit cost at MOQ (₹)</label><input id="n-cost" name="unitCostRupees" type="number" min={0} step="0.01" className="input" required /></div>
            <div><label className="label" htmlFor="n-ltmin">Lead time min</label><input id="n-ltmin" name="leadTimeDaysMin" type="number" min={0} className="input" required /></div>
            <div><label className="label" htmlFor="n-ltmax">Lead time max</label><input id="n-ltmax" name="leadTimeDaysMax" type="number" min={0} className="input" required /></div>
            <div><label className="label" htmlFor="n-mode">Supply mode</label><select id="n-mode" name="supplyMode" className="input"><option value="ready_stock">Ready stock</option><option value="made_to_order">Made to order</option></select></div>
            <div><label className="label" htmlFor="n-brand">Branding capabilities</label><input id="n-brand" name="brandingCapabilities" className="input" placeholder="laser_engraving" /></div>
            <div className="flex items-end"><button className="btn-primary" type="submit">Create offer</button></div>
          </form>
        )}
      </section>
    </div>
  );
}
