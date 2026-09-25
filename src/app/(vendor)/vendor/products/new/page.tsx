import { requireVendorContext } from "../../context";
import { listTaxonomy } from "@/modules/catalog/public";
import { proposeProductAction } from "../../actions";
import { Flash } from "@/components/ui/flash";

export default async function NewProposal({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const { membership } = await requireVendorContext();
  const tax = await listTaxonomy();
  return (
    <form action={proposeProductAction} className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Propose a product</h1>
      <p className="text-sm text-ink-muted">Submitted for platform review. Nothing is public until approved. Avoid unsupported claims such as “eco-friendly” or “BIS certified” unless evidence is on file.</p>
      <Flash error={sp.error} />
      <input type="hidden" name="vendorId" value={membership.vendorId} />
      <fieldset className="card grid gap-3 p-4">
        <legend className="px-1 text-sm font-semibold">Content</legend>
        <div><label className="label" htmlFor="name">Product name</label><input id="name" name="name" className="input" required minLength={3} /></div>
        <div><label className="label" htmlFor="shortSummary">Short summary (10–300 chars)</label><input id="shortSummary" name="shortSummary" className="input" required minLength={10} maxLength={300} /></div>
        <div><label className="label" htmlFor="description">Description</label><textarea id="description" name="description" className="input" rows={5} required minLength={20} /></div>
        <div><label className="label" htmlFor="keyBenefits">Key benefits (comma-separated)</label><input id="keyBenefits" name="keyBenefits" className="input" required /></div>
        <div><label className="label" htmlFor="recipientSuitability">Who is it for?</label><input id="recipientSuitability" name="recipientSuitability" className="input" required /></div>
        <div><label className="label" htmlFor="specifications">Specifications (name: value, comma-separated)</label><input id="specifications" name="specifications" className="input" placeholder="Capacity: 750 ml, Material: Stainless steel" /></div>
        <div><label className="label" htmlFor="brandingMethods">Branding methods (comma-separated; blank = none)</label><input id="brandingMethods" name="brandingMethods" className="input" placeholder="laser_engraving, screen_print" /></div>
        <div><label className="label" htmlFor="limitations">Limitations (optional)</label><input id="limitations" name="limitations" className="input" /></div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className="label" htmlFor="primaryCategorySlug">Category</label><select id="primaryCategorySlug" name="primaryCategorySlug" className="input" required>{tax.categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></div>
          <div><label className="label" htmlFor="recipientSlugs">Recipients</label><select id="recipientSlugs" name="recipientSlugs" className="input">{tax.terms.filter((t) => t.kind === "recipient").map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></div>
          <div><label className="label" htmlFor="occasionSlugs">Occasion</label><select id="occasionSlugs" name="occasionSlugs" className="input">{tax.terms.filter((t) => t.kind === "occasion").map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label" htmlFor="imageUrl">Hero image URL</label><input id="imageUrl" name="imageUrl" type="url" className="input" /><p className="help">Direct upload via the media pipeline is on the backlog; use an approved CDN URL.</p></div>
          <div><label className="label" htmlFor="imageAlt">Alt text</label><input id="imageAlt" name="imageAlt" className="input" /></div>
        </div>
      </fieldset>
      <fieldset className="card grid gap-3 p-4">
        <legend className="px-1 text-sm font-semibold">Variant</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className="label" htmlFor="v0label">Label</label><input id="v0label" name="variants.0.label" className="input" required placeholder="Navy, 750 ml" /></div>
          <div><label className="label" htmlFor="v0sku">SKU suffix</label><input id="v0sku" name="variants.0.skuSuffix" className="input" required pattern="[A-Z0-9]{1,12}(-[A-Z0-9]{1,12})?" placeholder="NV-750" /></div>
          <div><label className="label" htmlFor="v0colour">Colour</label><input id="v0colour" name="variants.0.colour" className="input" /></div>
        </div>
      </fieldset>
      <fieldset className="card grid gap-3 p-4">
        <legend className="px-1 text-sm font-semibold">Your supply offer (private)</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className="label" htmlFor="supplierSku">Your SKU</label><input id="supplierSku" name="supplierSku" className="input" /></div>
          <div><label className="label" htmlFor="moq">MOQ</label><input id="moq" name="moq" type="number" min={1} className="input" /></div>
          <div><label className="label" htmlFor="quantityIncrement">Quantity increment</label><input id="quantityIncrement" name="quantityIncrement" type="number" min={1} defaultValue={1} className="input" /></div>
          <div><label className="label" htmlFor="unitCostRupees">Unit cost at MOQ (₹)</label><input id="unitCostRupees" name="unitCostRupees" type="number" min={0} step="0.01" className="input" /></div>
          <div><label className="label" htmlFor="setupChargeRupees">Setup charge (₹)</label><input id="setupChargeRupees" name="setupChargeRupees" type="number" min={0} step="0.01" className="input" defaultValue={0} /></div>
          <div><label className="label" htmlFor="supplyMode">Supply mode</label><select id="supplyMode" name="supplyMode" className="input"><option value="ready_stock">Ready stock</option><option value="made_to_order">Made to order</option><option value="mixed">Mixed</option></select></div>
          <div><label className="label" htmlFor="leadTimeDaysMin">Lead time min (days)</label><input id="leadTimeDaysMin" name="leadTimeDaysMin" type="number" min={0} className="input" /></div>
          <div><label className="label" htmlFor="leadTimeDaysMax">Lead time max (days)</label><input id="leadTimeDaysMax" name="leadTimeDaysMax" type="number" min={0} className="input" /></div>
        </div>
        <p className="help">Costs are never shown to customers. Leave your SKU blank to add the offer later under Pricing.</p>
      </fieldset>
      <button className="btn-primary" type="submit">Submit for review</button>
    </form>
  );
}
