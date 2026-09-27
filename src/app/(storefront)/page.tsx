import Link from "next/link";
import { listPublishedProducts, listFiltersSchema, listTaxonomy } from "@/modules/catalog/public";
import { ProductCard } from "@/components/catalog/product-card";
import { CATEGORY_IMAGES, HERO_IMAGES, OCCASION_IMAGES, tileGradient, unsplash } from "@/components/catalog/visuals";
import { JsonLd, organizationJsonLd } from "@/seo/jsonld";
import { IconArrow, IconBox, IconBrush, IconCheck, IconClock, IconDoc, IconGift, IconSearch, IconShield, IconTag, IconTruck, IconUsers } from "@/components/ui/icons";

export const revalidate = 300;

const STEPS = [
  { n: "01", title: "Shortlist", body: "Pick gifts or ready kits. Set quantity, variant, branding and the date you need them by.", icon: IconGift },
  { n: "02", title: "Send requirements", body: "Verify one contact channel and submit your enquiry cart. You get a reference number the moment it is recorded.", icon: IconDoc },
  { n: "03", title: "We source and price", body: "Our team confirms stock, cost and lead time with suppliers privately, then builds one quotation.", icon: IconUsers },
  { n: "04", title: "Accept online", body: "Review a versioned quote with every inclusion stated and accept the current revision when you are ready.", icon: IconCheck },
];

const WHY = [
  { icon: IconTag, title: "Every price shows its basis", body: "From-prices state the qualifying quantity and whether GST, branding and shipping are included. Unknown prices say “request a quote”, never ₹0." },
  { icon: IconBrush, title: "Branding per product, not per promise", body: "Each gift lists the methods it actually supports — laser engraving, debossing, screen print, embroidery — with area and artwork notes." },
  { icon: IconClock, title: "MOQ and lead time upfront", body: "Minimum order quantity and a lead-time range sit on every card, and the clock starts after artwork approval where branding applies." },
  { icon: IconUsers, title: "Suppliers compared privately", body: "Several suppliers can back one gift. We compare cost, stock freshness and reliability behind the scenes; you see one coherent quote." },
  { icon: IconBox, title: "Kits with a real bill of materials", body: "Every fixed kit lists its components, quantities and packaging, and states whether it is assembled together or dispatched separately." },
  { icon: IconShield, title: "Your brief never drifts", body: "Submitted requirements are frozen as a snapshot. Later catalogue edits never rewrite what you asked for or what we quoted." },
];

const FAQ = [
  ["Do listed prices include GST or branding?", "Every price shows its exact basis. Unless stated, prices exclude GST, custom branding and shipping; your quotation confirms the final figures."],
  ["Is stock reserved when I add items to the enquiry cart?", "No. The enquiry cart is a structured procurement brief. Availability is confirmed with suppliers during quotation and nothing is bought or reserved until you accept a quote."],
  ["Do I need an account to enquire?", "No. Verify one contact channel (email or phone) to submit. An expiring secure link gives you access to your enquiry and quotation; you can create an account later."],
  ["What is the minimum order?", "It varies by gift and is shown on each card and product page. Smaller quantities can still be enquired and will be reviewed by our team."],
  ["How long does delivery take?", "Each product shows a lead-time range. For branded items the clock starts after artwork approval. Destination-specific dispatch and transit are confirmed in your quotation."],
  ["Who issues the quotation and invoice?", "Our team issues the quotation and manages suppliers on your behalf. Quotes are versioned and never edited in place; a revision supersedes the earlier one."],
];

export default async function HomePage() {
  const [featured, kits, tax] = await Promise.all([
    listPublishedProducts(listFiltersSchema.parse({ sort: "newest", kind: "product" })),
    listPublishedProducts(listFiltersSchema.parse({ sort: "newest", kind: "combo" })),
    listTaxonomy(),
  ]);
  const occasions = tax.terms.filter((t) => t.kind === "occasion");
  const recipients = tax.terms.filter((t) => t.kind === "recipient");
  const categories = tax.categories.filter((c) => c.slug !== "gift-kits");

  return (
    <div>
      <JsonLd data={organizationJsonLd()} />

      {/* ---------- Hero ---------- */}
      <section className="dark-panel">
        <div className="container-x grid items-center gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div>
            <p className="eyebrow text-white/80 [&::before]:bg-accent">Corporate gifting, enquiry-led</p>
            <h1 className="h-display mt-4 text-white">Gifts your people will actually keep — sourced, branded and quoted in one place.</h1>
            <p className="lede mt-5 max-w-xl text-white/75">Welcome kits, festive hampers, event merchandise and executive gifts for teams across India. Shortlist by occasion, quantity and budget, send your requirements, and receive one quotation with every inclusion stated.</p>
            <form action="/gifts" className="mt-7 flex max-w-xl flex-col gap-2 sm:flex-row" role="search">
              <label htmlFor="hero-q" className="sr-only">Search gifts</label>
              <div className="relative flex-1">
                <IconSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-subtle" />
                <input id="hero-q" name="q" type="search" placeholder="Try “welcome kit”, “bottle” or “Diwali hamper”" className="input h-13 pl-12 text-base" />
              </div>
              <button type="submit" className="btn-accent btn-lg">Search gifts</button>
            </form>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-white/75">
              <span>Popular:</span>
              {occasions.slice(0, 4).map((o) => <Link key={o.slug} href={`/occasions/${o.slug}`} className="rounded-full border border-white/25 px-3 py-1 hover:border-white hover:text-white">{o.name}</Link>)}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/gifts" className="btn-inverse btn-lg">Browse all gifts</Link>
              <Link href="/gift-finder" className="btn-lg inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 font-semibold text-white hover:bg-white/10">Find gifts for me <IconArrow width={18} height={18} /></Link>
            </div>
          </div>

          <div className="relative mb-8 lg:mb-0">
            <div className="grid grid-cols-[1.4fr_1fr] grid-rows-2 gap-3 lg:gap-4" style={{ aspectRatio: "6 / 5" }}>
              <div className="row-span-2 overflow-hidden rounded-[18px] shadow-lift">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={unsplash(HERO_IMAGES.main.id, 900, 1100)} alt={HERO_IMAGES.main.alt} width={900} height={1100} className="h-full w-full object-cover" fetchPriority="high" />
              </div>
              <div className="overflow-hidden rounded-[18px] shadow-lift">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={unsplash(HERO_IMAGES.bottles.id, 700, 520)} alt={HERO_IMAGES.bottles.alt} width={700} height={520} className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="overflow-hidden rounded-[18px] shadow-lift">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={unsplash(HERO_IMAGES.team.id, 700, 520)} alt={HERO_IMAGES.team.alt} width={700} height={520} className="h-full w-full object-cover" loading="lazy" />
              </div>
            </div>
            <div className="card-elevated absolute -bottom-5 left-4 flex items-center gap-3 px-4 py-3 text-ink sm:left-8">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-soft text-brand"><IconDoc /></span>
              <div className="text-sm leading-tight"><p className="font-semibold">One quotation, every inclusion stated</p><p className="text-ink-muted">GST · branding · shipping · lead time</p></div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <ul className="container-x grid grid-cols-2 gap-x-6 gap-y-4 py-6 text-sm sm:grid-cols-4">
            {[
              [IconBrush, "Custom branding", "Method and area listed per gift"],
              [IconClock, "MOQ & lead time", "Shown on every card"],
              [IconDoc, "Versioned quotes", "Never edited in place"],
              [IconTruck, "Pan-India delivery", "Confirmed per destination"],
            ].map(([Icon, t, b]) => {
              const I = Icon as typeof IconBrush;
              return (
                <li key={t as string} className="flex items-start gap-3">
                  <span className="mt-0.5 text-accent"><I /></span>
                  <div><p className="font-semibold text-white">{t as string}</p><p className="text-white/65">{b as string}</p></div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ---------- Categories ---------- */}
      <section className="section" aria-labelledby="cats">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="eyebrow">What we do</p><h2 id="cats" className="h-section mt-2">Every kind of gift, for every occasion</h2><p className="mt-2 max-w-xl text-ink-muted">Browse by category. Each gift lists its branding options, MOQ and lead time, and can be added to one enquiry alongside anything else.</p></div>
            <Link href="/gifts" className="btn-secondary">All gifts <IconArrow width={16} height={16} /></Link>
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
            {categories.slice(0, 10).map((c, i) => {
              const img = CATEGORY_IMAGES[c.slug];
              return (
                <li key={c.slug} className={i === 0 ? "col-span-2 row-span-2 sm:col-span-2 sm:row-span-2" : ""}>
                  <Link href={`/categories/${c.slug}`} className="tile h-full min-h-[160px]" style={{ background: tileGradient(c.slug), aspectRatio: i === 0 ? undefined : "1 / 1" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {img && <img src={unsplash(img.id, i === 0 ? 1000 : 600, i === 0 ? 1000 : 600)} alt="" aria-hidden width={600} height={600} loading="lazy" />}
                    <span className="tile-scrim" />
                    <span className="tile-body">
                      <span className={`block font-display font-bold ${i === 0 ? "text-2xl" : "text-base"}`}>{c.name}</span>
                      <span className="mt-1 inline-flex items-center gap-1 text-xs text-white/80">Explore <IconArrow width={14} height={14} /></span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ---------- Occasions ---------- */}
      <section className="section-tight bg-surface" aria-labelledby="occ">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="eyebrow">Gifting moments</p><h2 id="occ" className="h-section mt-2">Start from the occasion</h2></div>
            <div className="flex flex-wrap gap-2">{recipients.slice(0, 5).map((r) => <Link key={r.slug} href={`/recipients/${r.slug}`} className="chip">{r.name}</Link>)}</div>
          </div>
          <ul className="scroller mt-8 lg:grid lg:grid-cols-7 lg:overflow-visible">
            {occasions.map((o) => {
              const img = OCCASION_IMAGES[o.slug];
              return (
                <li key={o.slug} className="w-40 lg:w-auto">
                  <Link href={`/occasions/${o.slug}`} className="group block">
                    <span className="tile block aspect-[4/5]" style={{ background: tileGradient(o.slug) }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {img && <img src={unsplash(img.id, 480, 600)} alt="" aria-hidden width={480} height={600} loading="lazy" />}
                      <span className="tile-scrim" />
                    </span>
                    <span className="mt-3 block font-semibold group-hover:text-brand">{o.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ---------- Featured gifts ---------- */}
      <section className="section" aria-labelledby="featured">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="eyebrow">Newly added</p><h2 id="featured" className="h-section mt-2">Fresh in the catalogue</h2></div>
            <Link href="/gifts?sort=newest" className="btn-secondary">View all <IconArrow width={16} height={16} /></Link>
          </div>
          {featured.items.length === 0 ? (
            <div className="card mt-8 p-8 text-center text-ink-muted">The catalogue is being prepared. <Link href="/contact" className="text-brand underline">Send us a sourcing brief</Link> in the meantime.</div>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">{featured.items.slice(0, 8).map((p) => <ProductCard key={p.id} p={p} />)}</div>
          )}
        </div>
      </section>

      {/* ---------- Kits ---------- */}
      <section className="section bg-brand-tint" aria-labelledby="kits">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="eyebrow">Ready kits</p><h2 id="kits" className="h-section mt-2">Curated kits, assembled and branded together</h2><p className="mt-2 max-w-xl text-ink-muted">Every kit carries a versioned bill of materials — components, quantities, packaging — and states whether it ships assembled.</p></div>
            <Link href="/combos" className="btn-secondary">All kits <IconArrow width={16} height={16} /></Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {kits.items.slice(0, 3).map((p) => <ProductCard key={p.id} p={p} />)}
            <Link href="/contact" className="dark-panel card-hover flex flex-col justify-between rounded-[14px] p-6">
              <div><span className="badge-accent">Bespoke</span><h3 className="mt-4 font-display text-xl font-bold text-white">Have a brief but no product in mind?</h3><p className="mt-2 text-sm text-white/75">Tell us the recipient, count, budget and date. We propose a kit within your constraints.</p></div>
              <span className="mt-6 inline-flex items-center gap-2 font-semibold text-white">Send a sourcing brief <IconArrow width={18} height={18} /></span>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- Process ---------- */}
      <section className="section" aria-labelledby="process">
        <div className="container-x">
          <div className="max-w-2xl"><p className="eyebrow">The process</p><h2 id="process" className="h-section mt-2">From shortlist to accepted quote in four steps</h2><p className="mt-2 text-ink-muted">No checkout, no reservation, no surprises. You send requirements; we do the sourcing and come back with one document.</p></div>
          <ol className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.n} className="card-elevated relative p-6">
                <span className="absolute right-5 top-5 font-display text-4xl font-extrabold text-brand-soft">{s.n}</span>
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand text-white"><s.icon /></span>
                <h3 className="mt-5 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-ink-muted">{s.body}</p>
                {i < STEPS.length - 1 && <span aria-hidden className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-brand lg:flex"><IconArrow width={14} height={14} /></span>}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- Why ---------- */}
      <section className="section bg-surface" aria-labelledby="why">
        <div className="container-x grid gap-10 lg:grid-cols-[0.9fr_1.6fr]">
          <div>
            <p className="eyebrow">Why buy through us</p>
            <h2 id="why" className="h-section mt-2">Built for procurement, not impulse</h2>
            <p className="mt-3 text-ink-muted">Corporate gifting fails on details: a missed MOQ, a price that quietly excluded GST, a kit that arrived in pieces. The platform is designed so those details are visible before you commit.</p>
            <div className="mt-6 overflow-hidden rounded-[18px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={unsplash("photo-1710846529592-270f9784ad72", 900, 700)} alt="Cardboard box filled with assorted branded items" width={900} height={700} loading="lazy" className="aspect-[9/7] w-full object-cover" />
            </div>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {WHY.map((w) => (
              <li key={w.title} className="card p-5">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-soft text-brand"><w.icon /></span>
                <h3 className="mt-4 font-bold">{w.title}</h3>
                <p className="mt-1.5 text-sm text-ink-muted">{w.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="section" aria-labelledby="faq">
        <div className="container-x grid gap-10 lg:grid-cols-[0.8fr_1.4fr]">
          <div><p className="eyebrow">Procurement FAQ</p><h2 id="faq" className="h-section mt-2">Questions buyers ask before their first enquiry</h2><p className="mt-3 text-ink-muted">Anything else? <Link href="/contact" className="font-semibold text-brand underline">Contact the team</Link>.</p></div>
          <div className="faq">
            {FAQ.map(([q, a]) => (<details key={q}><summary>{q}</summary><div>{a}</div></details>))}
          </div>
        </div>
      </section>

      {/* ---------- CTA band ---------- */}
      <section className="container-x pb-4">
        <div className="dark-panel flex flex-col items-start justify-between gap-6 rounded-[20px] px-8 py-10 lg:flex-row lg:items-center lg:px-12">
          <div><h2 className="font-display text-2xl font-bold text-white lg:text-3xl">Ready to shortlist?</h2><p className="mt-2 max-w-xl text-white/75">Add gifts and kits to one enquiry, or send a brief without picking products. Our team replies within published operating hours (IST).</p></div>
          <div className="flex flex-wrap gap-3"><Link href="/gifts" className="btn-inverse btn-lg">Browse gifts</Link><Link href="/become-a-vendor" className="btn-lg inline-flex items-center rounded-xl border border-white/30 px-6 font-semibold text-white hover:bg-white/10">Supply to us</Link></div>
        </div>
      </section>
    </div>
  );
}
