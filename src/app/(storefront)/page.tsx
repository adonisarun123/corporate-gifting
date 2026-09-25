import Link from "next/link";
import { listPublishedProducts, listFiltersSchema, listTaxonomy } from "@/modules/catalog/public";
import { ProductCard } from "@/components/catalog/product-card";
import { JsonLd, organizationJsonLd } from "@/seo/jsonld";

export const revalidate = 300;

export default async function HomePage() {
  const [featured, tax] = await Promise.all([listPublishedProducts(listFiltersSchema.parse({ sort: "newest" })), listTaxonomy()]);
  const occasions = tax.terms.filter((t) => t.kind === "occasion");
  const recipients = tax.terms.filter((t) => t.kind === "recipient");
  return (
    <div className="space-y-14">
      <JsonLd data={organizationJsonLd()} />
      <section className="grid items-center gap-8 lg:grid-cols-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Corporate gifts and kits selected around your occasion, quantity and budget</h1>
          <p className="mt-4 max-w-prose text-ink-muted">Shortlist individual gifts or ready-to-customise combos, send your requirements, and receive one tailored quotation from our team. Adding to the enquiry cart never buys or reserves stock.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/gifts" className="btn-primary">Shop gifts</Link>
            <Link href="/combos" className="btn-secondary">Explore combos</Link>
            <Link href="/gift-finder" className="btn-secondary">Find gifts for me</Link>
          </div>
        </div>
        <ol className="card grid gap-4 p-6 text-sm sm:grid-cols-3">
          {[["1", "Shortlist", "Pick gifts or kits and set quantities, branding and dates."], ["2", "Send requirements", "Verify one contact channel and submit your enquiry cart."], ["3", "Receive a quotation", "Our team sources, prices and issues a versioned quote you can accept online."]].map(([n, t, b]) => (
            <li key={n}>
              <span className="badge-brand">{n}</span>
              <p className="mt-2 font-semibold">{t}</p>
              <p className="text-ink-muted">{b}</p>
            </li>
          ))}
        </ol>
      </section>

      {(occasions.length > 0 || recipients.length > 0) && (
        <section aria-labelledby="entry-points">
          <h2 id="entry-points" className="text-xl font-semibold">Start from your need</h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-ink-muted">By occasion</h3>
              <ul className="mt-2 flex flex-wrap gap-2">{occasions.map((o) => <li key={o.id}><Link href={`/occasions/${o.slug}`} className="btn-secondary">{o.name}</Link></li>)}</ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink-muted">By recipient</h3>
              <ul className="mt-2 flex flex-wrap gap-2">{recipients.map((o) => <li key={o.id}><Link href={`/recipients/${o.slug}`} className="btn-secondary">{o.name}</Link></li>)}</ul>
            </div>
          </div>
        </section>
      )}

      <section aria-labelledby="featured">
        <div className="flex items-baseline justify-between">
          <h2 id="featured" className="text-xl font-semibold">Recently added</h2>
          <Link href="/gifts" className="text-sm font-medium text-brand hover:underline">All gifts</Link>
        </div>
        {featured.items.length === 0 ? (
          <p className="mt-4 text-ink-muted">The catalogue is being prepared. Ask us for a sourcing brief in the meantime.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{featured.items.slice(0, 8).map((p) => <ProductCard key={p.id} p={p} />)}</div>
        )}
      </section>

      <section className="card p-6">
        <h2 className="text-xl font-semibold">Procurement FAQ</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="font-semibold">Do listed prices include GST or branding?</dt><dd className="text-ink-muted">Every price shows its exact basis. Unless stated, prices exclude GST, custom branding and shipping; your quotation confirms the final figures.</dd></div>
          <div><dt className="font-semibold">Is stock reserved when I add items?</dt><dd className="text-ink-muted">No. Availability is confirmed with suppliers during quotation.</dd></div>
          <div><dt className="font-semibold">Do I need an account?</dt><dd className="text-ink-muted">No. Verify one contact channel to submit; an expiring secure link gives you access to your quote.</dd></div>
          <div><dt className="font-semibold">Who is the seller?</dt><dd className="text-ink-muted">Our team issues the quotation and manages suppliers on your behalf. <Link href="/contact" className="text-brand underline">Contact us</Link> for anything else.</dd></div>
        </dl>
      </section>
    </div>
  );
}
