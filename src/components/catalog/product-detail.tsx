import Link from "next/link";
import type { PublicProductDetail } from "@/modules/catalog/public";
import { PriceBasis } from "./price-basis";
import { AvailabilityBadge } from "./availability-badge";
import { AddToEnquiry } from "./add-to-enquiry";
import { JsonLd, breadcrumbJsonLd, productJsonLd } from "@/seo/jsonld";

export function ProductDetail({ p }: { p: PublicProductDetail }) {
  const c = p.content;
  const section = p.kind === "combo" ? { name: "Combos", path: "/combos" } : { name: "Gifts", path: "/gifts" };
  return (
    <article className="space-y-10">
      <JsonLd data={productJsonLd(p)} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, section, { name: p.name, path: `${section.path}/${p.slug}` }])} />
      <nav aria-label="Breadcrumb" className="text-sm text-ink-muted"><Link href="/">Home</Link> / <Link href={section.path}>{section.name}</Link> / {p.name}</nav>

      <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <div className="card overflow-hidden">
            {p.gallery[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.gallery[0].url} alt={p.gallery[0].alt} width={1200} height={900} className="aspect-[4/3] w-full object-cover" fetchPriority="high" />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center text-sm text-ink-muted">Product photography to follow</div>
            )}
          </div>
          {p.gallery.length > 1 && (
            <ul className="grid grid-cols-4 gap-2">{p.gallery.slice(1).map((g) => (
              // eslint-disable-next-line @next/next/no-img-element
              <li key={g.url} className="card overflow-hidden"><img src={g.url} alt={g.alt} width={300} height={225} loading="lazy" className="aspect-[4/3] w-full object-cover" /></li>
            ))}</ul>
          )}
          <header>
            <h1 className="text-2xl font-bold sm:text-3xl">{p.name}</h1>
            <p className="mt-1 text-sm text-ink-muted">Product code {p.publicCode}{p.categoryName ? ` · ${p.categoryName}` : ""}</p>
            <p className="mt-3 max-w-prose">{c.shortSummary}</p>
          </header>
          <div className="card space-y-2 p-4">
            <PriceBasis price={p.price} />
            <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              {p.minMoq !== null && <div><dt className="inline text-ink-muted">MOQ </dt><dd className="inline font-medium">{p.minMoq.toLocaleString("en-IN")}</dd></div>}
              {p.leadTimeDays && <div><dt className="inline text-ink-muted">Lead time </dt><dd className="inline font-medium">{p.leadTimeDays[0]}–{p.leadTimeDays[1]} days after artwork approval</dd></div>}
              <div><AvailabilityBadge state={p.stockState} /></div>
            </dl>
          </div>
        </div>
        <div>
          <AddToEnquiry productId={p.id} kind={p.kind} minMoq={p.minMoq} variants={p.variants} brandingMethods={c.brandingMethods} />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-8">
          <section><h2 className="text-lg font-semibold">Overview</h2><p className="mt-2 max-w-prose whitespace-pre-line">{c.description}</p>
            {c.keyBenefits.length > 0 && <ul className="mt-3 list-disc pl-5">{c.keyBenefits.map((b) => <li key={b}>{b}</li>)}</ul>}</section>
          <section><h2 className="text-lg font-semibold">Who is this for?</h2><p className="mt-2 max-w-prose">{c.recipientSuitability}</p>
            {(p.recipients.length > 0 || p.occasions.length > 0) && <p className="mt-2 text-sm text-ink-muted">{[...p.recipients, ...p.occasions].join(" · ")}</p>}</section>
          {p.components.length > 0 && (
            <section><h2 className="text-lg font-semibold">What is in the kit</h2>
              <table className="table mt-2"><thead><tr><th>Item</th><th>Variant</th><th>Per kit</th></tr></thead>
                <tbody>{p.components.map((k) => <tr key={k.variantId}><td><Link href={`/gifts/${k.productSlug}`} className="text-brand underline">{k.productName}</Link></td><td>{k.label}</td><td>{k.unitsPerKit}</td></tr>)}</tbody></table>
              <p className="mt-2 text-sm text-ink-muted">{p.assemblyMode === "assembled" ? "Kits are assembled together before dispatch." : "Components are dispatched separately."}</p></section>
          )}
          {c.specifications.length > 0 && (
            <section><h2 className="text-lg font-semibold">Specifications</h2>
              <dl className="mt-2 grid gap-2 sm:grid-cols-2">{c.specifications.map((s) => <div key={s.name} className="flex justify-between border-b border-border py-1 text-sm"><dt className="text-ink-muted">{s.name}</dt><dd className="font-medium">{s.value}{s.unit ? ` ${s.unit}` : ""}</dd></div>)}</dl></section>
          )}
          <section><h2 className="text-lg font-semibold">Branding</h2>
            <p className="mt-2">{c.brandingMethods.length ? `Available methods: ${c.brandingMethods.map((m) => m.replace(/_/g, " ")).join(", ")}.` : "No branding is offered on this item."}</p>
            {c.brandingNotes && <p className="mt-1 text-sm text-ink-muted">{c.brandingNotes}</p>}</section>
          <section><h2 className="text-lg font-semibold">Delivery</h2><p className="mt-2 max-w-prose text-sm">Serviceability, production and dispatch assumptions are confirmed in your quotation for your destination and date. Lead time starts after artwork approval where branding applies.</p></section>
          {(c.limitations || c.careInstructions) && (
            <section><h2 className="text-lg font-semibold">Quality and care</h2>{c.limitations && <p className="mt-2 text-sm">{c.limitations}</p>}{c.careInstructions && <p className="mt-1 text-sm text-ink-muted">{c.careInstructions}</p>}</section>
          )}
          {c.faqs.length > 0 && (
            <section><h2 className="text-lg font-semibold">Questions</h2>
              <dl className="mt-2 space-y-3">{c.faqs.map((f) => <div key={f.question}><dt className="font-medium">{f.question}</dt><dd className="text-sm text-ink-muted">{f.answer}</dd></div>)}</dl></section>
          )}
        </div>
      </div>
    </article>
  );
}
