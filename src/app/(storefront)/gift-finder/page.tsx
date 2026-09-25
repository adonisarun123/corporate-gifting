import type { Metadata } from "next";
import Link from "next/link";
import { listPublishedProducts, listFiltersSchema, listTaxonomy } from "@/modules/catalog/public";
import { ProductCard } from "@/components/catalog/product-card";

export const metadata: Metadata = { title: "Gift finder", description: "Answer a few questions about recipient, occasion, quantity and budget to get deterministic, explainable gift suggestions.", alternates: { canonical: "/gift-finder" } };

/** Rule-based finder (spec §21): hard constraints first, explanations from product facts. No AI. */
export default async function GiftFinderPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const tax = await listTaxonomy();
  const recipients = tax.terms.filter((t) => t.kind === "recipient");
  const occasions = tax.terms.filter((t) => t.kind === "occasion");
  const asked = Boolean(sp.recipient || sp.occasion || sp.quantity || sp.budget);
  let results: Awaited<ReturnType<typeof listPublishedProducts>> | null = null;
  if (asked) {
    results = await listPublishedProducts(listFiltersSchema.parse({ recipient: sp.recipient || undefined, occasion: sp.occasion || undefined, quantity: sp.quantity || undefined, budgetMaxMinor: sp.budget ? String(Number(sp.budget) * 100) : undefined, includeUnpriced: "true", sort: "relevance" }));
  }
  return (
    <div className="space-y-8">
      {asked && <meta name="robots" content="noindex,follow" />}
      <div>
        <h1 className="text-2xl font-bold">Find gifts for me</h1>
        <p className="mt-2 max-w-prose text-ink-muted">Tell us who it is for, the occasion, how many, and a budget per gift. We apply hard constraints first (publication, MOQ at your quantity, budget basis) and explain each suggestion from the product record. Delivery dates are confirmed at quotation.</p>
      </div>
      <form className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5" action="/gift-finder">
        <div><label className="label" htmlFor="gf-rec">Recipient</label><select id="gf-rec" name="recipient" defaultValue={sp.recipient ?? ""} className="input"><option value="">Any</option>{recipients.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}</select></div>
        <div><label className="label" htmlFor="gf-occ">Occasion</label><select id="gf-occ" name="occasion" defaultValue={sp.occasion ?? ""} className="input"><option value="">Any</option>{occasions.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}</select></div>
        <div><label className="label" htmlFor="gf-qty">Quantity</label><input id="gf-qty" name="quantity" type="number" min={1} defaultValue={sp.quantity ?? ""} className="input" /></div>
        <div><label className="label" htmlFor="gf-budget">Budget per gift (₹)</label><input id="gf-budget" name="budget" type="number" min={0} defaultValue={sp.budget ?? ""} className="input" /></div>
        <div className="flex items-end"><button className="btn-primary w-full" type="submit">Show suggestions</button></div>
      </form>
      {results && (
        results.items.length === 0 ? (
          <div className="card p-6">
            <h2 className="font-semibold">No gift meets every constraint</h2>
            <p className="mt-1 text-sm text-ink-muted">We never silently raise your budget or ignore a deadline. Try a higher budget or smaller quantity, or <Link href="/contact" className="text-brand underline">send a sourcing brief</Link>.</p>
          </div>
        ) : (
          <section>
            <h2 className="text-lg font-semibold">{results.total} suggestion{results.total === 1 ? "" : "s"}</h2>
            <ul className="mt-4 grid gap-4 md:grid-cols-2">
              {results.items.map((p) => (
                <li key={p.id} className="grid gap-3 sm:grid-cols-[200px_1fr]">
                  <ProductCard p={p} />
                  <div className="text-sm">
                    <p className="font-medium">Why it qualifies</p>
                    <ul className="mt-1 list-disc pl-5 text-ink-muted">
                      {p.recipients.length > 0 && <li>Suited to {p.recipients.join(", ").toLowerCase()}</li>}
                      {p.occasions.length > 0 && <li>Listed for {p.occasions.join(", ").toLowerCase()}</li>}
                      {p.minMoq !== null && sp.quantity && <li>Meets the {p.minMoq}-unit MOQ at your quantity of {sp.quantity}</li>}
                      {p.price.unitPriceMinor !== null ? <li>Public from-price within budget for {p.price.qualifyingQuantity} units</li> : <li>No public price yet — priced at quotation</li>}
                      <li>{p.stockState === "fresh" ? "Stock reported recently" : "Availability needs confirmation"}; delivery for your date is confirmed at quotation</li>
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )
      )}
    </div>
  );
}
