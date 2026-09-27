import type { Metadata } from "next";
import Link from "next/link";
import { listPublishedProducts, listFiltersSchema, listTaxonomy } from "@/modules/catalog/public";
import { ProductCard } from "@/components/catalog/product-card";
import { Breadcrumbs, PageShell } from "@/components/layout/page-shell";
import { IconCheck, IconSpark } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Gift finder", description: "Answer a few questions about recipient, occasion, quantity and budget to get deterministic, explainable gift suggestions.", alternates: { canonical: "/gift-finder" } };

const BUDGETS = [500, 1000, 1500, 2500, 5000];

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return <div><label className="label" htmlFor={id}>{label}</label>{children}</div>;
}

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
    <PageShell>
      {asked && <meta name="robots" content="noindex,follow" />}
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Gift finder" }]} />
      <section className="dark-panel mt-4 grid gap-8 rounded-[20px] p-6 sm:p-10 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="eyebrow text-white/80 [&::before]:bg-accent">Gift finder</p>
          <h1 className="h-section mt-3 text-white">Tell us who, why, how many and how much.</h1>
          <p className="mt-3 text-white/75">We apply hard constraints first — published gifts, MOQ at your quantity, your budget basis — and explain every suggestion from the product record. Nothing is silently relaxed: we never raise your budget or ignore a deadline.</p>
          <ul className="mt-5 space-y-2 text-sm text-white/80">
            {["Rule-based, not a black box", "Budget filters use the same price basis as the cards", "Delivery dates are confirmed at quotation"].map((t) => <li key={t} className="flex items-start gap-2"><IconCheck width={16} height={16} className="mt-0.5 text-accent" />{t}</li>)}
          </ul>
        </div>
        <form className="card grid gap-4 p-5 text-ink sm:grid-cols-2" action="/gift-finder">
          <Field id="gf-rec" label="Who is it for?"><select id="gf-rec" name="recipient" defaultValue={sp.recipient ?? ""} className="input"><option value="">Anyone</option>{recipients.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}</select></Field>
          <Field id="gf-occ" label="Occasion"><select id="gf-occ" name="occasion" defaultValue={sp.occasion ?? ""} className="input"><option value="">Any occasion</option>{occasions.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}</select></Field>
          <Field id="gf-qty" label="How many?"><input id="gf-qty" name="quantity" type="number" min={1} defaultValue={sp.quantity ?? ""} className="input" placeholder="e.g. 250" /></Field>
          <Field id="gf-budget" label="Budget per gift (₹)">
            <input id="gf-budget" name="budget" type="number" min={0} defaultValue={sp.budget ?? ""} className="input" placeholder="e.g. 1500" list="gf-budgets" />
            <datalist id="gf-budgets">{BUDGETS.map((b) => <option key={b} value={b} />)}</datalist>
          </Field>
          <p className="text-xs text-ink-muted sm:col-span-2">Budget is compared against the public from-price at your quantity, excluding GST, branding and shipping unless a product states otherwise.</p>
          <button className="btn-primary btn-lg sm:col-span-2" type="submit"><IconSpark width={18} height={18} /> Show suggestions</button>
        </form>
      </section>

      {!asked && (
        <section className="mt-10" aria-labelledby="presets">
          <p className="eyebrow">Common briefs</p>
          <h2 id="presets" className="h-section mt-2">Start from a typical requirement</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "Welcome kits for 100 new joiners", body: "Onboarding gifts under ₹1,500 per person.", href: "/gift-finder?recipient=new-joiners&occasion=onboarding&quantity=100&budget=1500" },
              { title: "Diwali gifts for 250 employees", body: "Festive picks under ₹1,000 each.", href: "/gift-finder?recipient=employees&occasion=festive-gifting&quantity=250&budget=1000" },
              { title: "Conference giveaways for 500", body: "Event items under ₹500 per delegate.", href: "/gift-finder?recipient=event-attendees&occasion=conferences&quantity=500&budget=500" },
              { title: "Client appreciation for 25 accounts", body: "Executive-grade gifts under ₹5,000.", href: "/gift-finder?recipient=clients&occasion=client-appreciation&quantity=25&budget=5000" },
            ].map((x) => (
              <li key={x.href}><Link href={x.href} className="card card-hover block h-full p-5"><p className="font-bold">{x.title}</p><p className="mt-1 text-sm text-ink-muted">{x.body}</p><span className="mt-3 inline-block text-sm font-semibold text-brand">Run this brief →</span></Link></li>
            ))}
          </ul>
        </section>
      )}

      {results && (
        results.items.length === 0 ? (
          <div className="card mt-8 p-8 text-center">
            <h2 className="text-lg font-bold">No gift meets every constraint</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">We never silently raise your budget or ignore a deadline. Try a higher budget or smaller quantity, or send us a sourcing brief and we will propose options.</p>
            <div className="mt-4 flex justify-center gap-2"><Link href="/gift-finder" className="btn-secondary">Adjust answers</Link><Link href="/contact" className="btn-primary">Send a sourcing brief</Link></div>
          </div>
        ) : (
          <section className="mt-10">
            <div className="flex items-end justify-between gap-4"><div><p className="eyebrow">Results</p><h2 className="h-section mt-2">{results.total} suggestion{results.total === 1 ? "" : "s"}</h2></div><Link href="/gift-finder" className="btn-secondary">Adjust answers</Link></div>
            <ul className="mt-6 grid gap-5 lg:grid-cols-2">
              {results.items.map((p) => (
                <li key={p.id} className="card grid gap-4 p-4 sm:grid-cols-[220px_1fr]">
                  <ProductCard p={p} />
                  <div className="text-sm">
                    <p className="font-bold">Why it qualifies</p>
                    <ul className="mt-2 space-y-1.5 text-ink-muted">
                      {p.recipients.length > 0 && <li className="flex gap-2"><IconCheck width={16} height={16} className="mt-0.5 shrink-0 text-success" />Suited to {p.recipients.join(", ").toLowerCase()}</li>}
                      {p.occasions.length > 0 && <li className="flex gap-2"><IconCheck width={16} height={16} className="mt-0.5 shrink-0 text-success" />Listed for {p.occasions.join(", ").toLowerCase()}</li>}
                      {p.minMoq !== null && sp.quantity && <li className="flex gap-2"><IconCheck width={16} height={16} className="mt-0.5 shrink-0 text-success" />Meets the {p.minMoq.toLocaleString("en-IN")}-unit MOQ at your quantity of {Number(sp.quantity).toLocaleString("en-IN")}</li>}
                      {p.price.unitPriceMinor !== null ? <li className="flex gap-2"><IconCheck width={16} height={16} className="mt-0.5 shrink-0 text-success" />Public from-price within budget for {p.price.qualifyingQuantity?.toLocaleString("en-IN")} units</li> : <li className="flex gap-2"><span className="mt-0.5 w-4 shrink-0 text-center text-warning">?</span>No public price yet — priced at quotation</li>}
                      <li className="flex gap-2"><span className="mt-0.5 w-4 shrink-0 text-center text-ink-subtle">·</span>{p.stockState === "fresh" ? "Stock reported recently" : "Availability needs confirmation"}; delivery for your date is confirmed at quotation</li>
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )
      )}
    </PageShell>
  );
}
