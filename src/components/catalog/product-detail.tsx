import Link from "next/link";
import type { PublicProductCard, PublicProductDetail } from "@/modules/catalog/public";
import { PriceBasis } from "./price-basis";
import { AvailabilityBadge } from "./availability-badge";
import { AddToEnquiry } from "./add-to-enquiry";
import { Gallery } from "./gallery";
import { ProductCard } from "./product-card";
import { JsonLd, breadcrumbJsonLd, productJsonLd } from "@/seo/jsonld";
import { Breadcrumbs, PageShell } from "@/components/layout/page-shell";
import { IconBox, IconBrush, IconCheck, IconClock, IconShield, IconTruck } from "@/components/ui/icons";

const humanise = (s: string) => { const t = s.replace(/_/g, " "); return t.charAt(0).toUpperCase() + t.slice(1); };

export function ProductDetail({ p, related = [] }: { p: PublicProductDetail; related?: PublicProductCard[] }) {
  const c = p.content;
  const isKit = p.kind === "combo";
  const section = isKit ? { name: "Kits & combos", path: "/combos" } : { name: "All gifts", path: "/gifts" };
  const facts = [
    p.minMoq !== null && { icon: IconBox, label: "Minimum order", value: `${p.minMoq.toLocaleString("en-IN")} ${isKit ? "kits" : "units"}` },
    p.leadTimeDays && { icon: IconClock, label: "Lead time", value: `${p.leadTimeDays[0]}–${p.leadTimeDays[1]} working days`, note: c.brandingMethods.length ? "after artwork approval" : undefined },
    { icon: IconBrush, label: "Branding", value: c.brandingMethods.length ? c.brandingMethods.map(humanise).join(", ") : "Not offered on this item" },
    { icon: IconTruck, label: "Delivery", value: "Pan-India; confirmed per destination in your quote" },
  ].filter(Boolean) as Array<{ icon: typeof IconBox; label: string; value: string; note?: string }>;

  return (
    <PageShell>
      <JsonLd data={productJsonLd(p)} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, section, { name: p.name, path: `${section.path}/${p.slug}` }])} />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: section.name, href: section.path }, ...(p.categoryName && p.categorySlug ? [{ name: p.categoryName, href: `/categories/${p.categorySlug}` }] : []), { name: p.name }]} />

      <article className="mt-5 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
        <Gallery images={p.gallery} name={p.name} slug={p.slug} />

        <div className="space-y-6">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              {isKit && <span className="badge-accent">Fixed kit</span>}
              {p.categoryName && !isKit && <span className="badge-neutral">{p.categoryName}</span>}
              <span className="text-xs text-ink-subtle">Code {p.publicCode}</span>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{p.name}</h1>
            <p className="mt-3 max-w-prose text-ink-muted">{c.shortSummary}</p>
            {(p.recipients.length > 0 || p.occasions.length > 0) && (
              <ul className="mt-3 flex flex-wrap gap-1.5">{[...p.occasions, ...p.recipients].map((t) => <li key={t} className="badge-brand">{t}</li>)}</ul>
            )}
          </header>

          <div className="card-elevated p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <PriceBasis price={p.price} unit={isKit ? "kit" : "gift"} />
              {isKit ? <span className="badge-neutral">◷ Assembled to order</span> : <AvailabilityBadge state={p.stockState} />}
            </div>
            <dl className="mt-5 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
              {facts.map((f) => (
                <div key={f.label} className="flex gap-3">
                  <span className="mt-0.5 text-brand"><f.icon width={18} height={18} /></span>
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{f.label}</dt><dd className="text-sm font-medium">{f.value}{f.note && <span className="block text-xs font-normal normal-case text-ink-muted">{f.note}</span>}</dd></div>
                </div>
              ))}
            </dl>
          </div>

          <AddToEnquiry productId={p.id} kind={p.kind} minMoq={p.minMoq ?? (isKit ? p.price.qualifyingQuantity : null)} variants={p.variants} brandingMethods={c.brandingMethods} />

          <ul className="grid gap-2 text-sm text-ink-muted sm:grid-cols-2">
            {["No payment or reservation until you accept a quote", "Your submitted brief is frozen as a snapshot", "One quotation with GST, branding and shipping stated", "Suppliers stay behind the scenes; we manage them"].map((t) => (
              <li key={t} className="flex items-start gap-2"><IconCheck width={16} height={16} className="mt-0.5 shrink-0 text-success" />{t}</li>
            ))}
          </ul>
        </div>
      </article>

      {/* Below the fold */}
      <div className="mt-14 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
        <div className="space-y-10">
          <section><h2 className="text-xl font-bold">Overview</h2><p className="mt-3 max-w-prose whitespace-pre-line leading-relaxed">{c.description}</p>
            {c.keyBenefits.length > 0 && <ul className="mt-4 grid gap-2 sm:grid-cols-2">{c.keyBenefits.map((b) => <li key={b} className="flex items-start gap-2 text-sm"><IconCheck width={16} height={16} className="mt-0.5 shrink-0 text-brand" />{b}</li>)}</ul>}</section>

          <section><h2 className="text-xl font-bold">Who is this for?</h2><p className="mt-3 max-w-prose">{c.recipientSuitability}</p></section>

          {p.components.length > 0 && (
            <section><h2 className="text-xl font-bold">What is in the kit</h2>
              <div className="card mt-3 overflow-hidden"><table className="table"><thead><tr><th>Item</th><th>Variant</th><th className="text-right">Per kit</th></tr></thead>
                <tbody>{p.components.map((k) => <tr key={k.variantId}><td><Link href={`/gifts/${k.productSlug}`} className="font-medium text-brand hover:underline">{k.productName}</Link></td><td className="text-ink-muted">{k.label}</td><td className="text-right font-medium">{k.unitsPerKit}</td></tr>)}</tbody></table></div>
              <p className="mt-2 flex items-center gap-2 text-sm text-ink-muted"><IconBox width={16} height={16} />{p.assemblyMode === "assembled" ? "Kits are assembled together before dispatch." : "Components are dispatched separately."}</p></section>
          )}

          {c.specifications.length > 0 && (
            <section><h2 className="text-xl font-bold">Specifications</h2>
              <dl className="mt-3 grid gap-x-8 sm:grid-cols-2">{c.specifications.map((s) => <div key={s.name} className="flex justify-between gap-4 border-b border-border py-2.5 text-sm"><dt className="text-ink-muted">{s.name}</dt><dd className="text-right font-medium">{s.value}{s.unit ? ` ${s.unit}` : ""}</dd></div>)}</dl></section>
          )}

          <section><h2 className="text-xl font-bold">Branding</h2>
            <p className="mt-3">{c.brandingMethods.length ? <>Available methods: <strong>{c.brandingMethods.map(humanise).join(", ")}</strong>.</> : "No branding is offered on this item."}</p>
            {c.brandingNotes && <p className="mt-1 text-sm text-ink-muted">{c.brandingNotes}</p>}
            {c.brandingMethods.length > 0 && <p className="mt-2 text-sm text-ink-muted">Setup charges, per-unit branding cost and artwork requirements are stated in your quotation. Lead time starts after artwork approval.</p>}</section>

          <section><h2 className="text-xl font-bold">Delivery</h2><p className="mt-3 max-w-prose text-sm text-ink-muted">Serviceability, production and dispatch assumptions are confirmed in your quotation for your destination and date. Multi-location delivery can be specified per line in the enquiry cart.</p></section>

          {(c.limitations || c.careInstructions) && (
            <section><h2 className="text-xl font-bold">Quality and care</h2>{c.limitations && <p className="mt-3 text-sm">{c.limitations}</p>}{c.careInstructions && <p className="mt-1 text-sm text-ink-muted">{c.careInstructions}</p>}</section>
          )}

          {c.faqs.length > 0 && (
            <section><h2 className="text-xl font-bold">Questions about this gift</h2>
              <div className="faq mt-3">{c.faqs.map((f) => <details key={f.question}><summary>{f.question}</summary><div>{f.answer}</div></details>)}</div></section>
          )}
        </div>

        <aside className="space-y-4 lg:pt-1">
          <div className="card p-5">
            <h2 className="flex items-center gap-2 font-bold"><IconShield className="text-brand" width={18} height={18} /> How pricing works here</h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-muted">
              <li>“From” prices state the qualifying quantity and what they include.</li>
              <li>“Indicative budget” is an estimate, not a firm selling price.</li>
              <li>“Request a quote” means no public price is set yet — never ₹0.</li>
              <li>Your quotation is versioned and never edited in place.</li>
            </ul>
            <Link href="/how-it-works" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">See how it works →</Link>
          </div>
          <div className="dark-panel rounded-[14px] p-5">
            <h2 className="font-bold text-white">Want this in a kit?</h2>
            <p className="mt-2 text-sm text-white/75">Tell us the recipient, count and budget — we propose a composition around this item, with packaging and a single branding brief.</p>
            <Link href="/contact" className="btn-inverse mt-4">Send a sourcing brief</Link>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-16" aria-labelledby="related">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Related options</p><h2 id="related" className="h-section mt-2">Alternatives and companions</h2></div>{p.categorySlug && <Link href={`/categories/${p.categorySlug}`} className="btn-secondary">More in {p.categoryName}</Link>}</div>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">{related.slice(0, 4).map((r) => <ProductCard key={r.id} p={r} />)}</div>
        </section>
      )}
    </PageShell>
  );
}
