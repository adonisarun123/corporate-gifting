import Link from "next/link";
import { listPublishedProducts, listTaxonomy, type ListFilters } from "@/modules/catalog/public";
import { ActiveFilterChips, CatalogLayout, ListingFilters, ListingGrid, filtersToQuery } from "./listing";
import { CATEGORY_IMAGES, OCCASION_IMAGES, tileGradient, unsplash } from "./visuals";
import { Breadcrumbs, LandingHero, PageShell } from "@/components/layout/page-shell";
import { JsonLd, breadcrumbJsonLd } from "@/seo/jsonld";

type Kind = "category" | "occasion" | "recipient";
const LABEL: Record<Kind, string> = { category: "Category", occasion: "Occasion", recipient: "Recipient" };
const PATH: Record<Kind, string> = { category: "/categories", occasion: "/occasions", recipient: "/recipients" };

/** Shared landing page for taxonomy collections. Curated pages are indexable; filtered variants are noindex (spec §24). */
export async function TaxonomyLanding({ kind, slug, term, filters, filtered }: { kind: Kind; slug: string; term: { name: string; description?: string | null }; filters: ListFilters; filtered: boolean }) {
  const basePath = `${PATH[kind]}/${slug}`;
  const [result, tax] = await Promise.all([listPublishedProducts(filters), listTaxonomy()]);
  const recipients = tax.terms.filter((t) => t.kind === "recipient");
  const occasions = tax.terms.filter((t) => t.kind === "occasion");
  const query = filtersToQuery({ ...filters, [kind]: undefined });
  const img = (kind === "category" ? CATEGORY_IMAGES : OCCASION_IMAGES)[slug];
  const siblings = kind === "category" ? tax.categories.map((c) => ({ slug: c.slug, name: c.name })) : tax.terms.filter((t) => t.kind === kind).map((t) => ({ slug: t.slug, name: t.name }));
  const fallbackBody = kind === "category"
    ? `Corporate gifts in ${term.name.toLowerCase()}: each one lists its branding options, minimum order quantity and lead time, with the price basis stated.`
    : kind === "occasion"
      ? `Gifts and kits that suit ${term.name.toLowerCase()}. Enter your quantity to see the price tier that applies, then add everything to one enquiry.`
      : `Gifts chosen for ${term.name.toLowerCase()}, with MOQ, lead time and branding options on every card.`;
  return (
    <PageShell>
      {filtered && <meta name="robots" content="noindex,follow" />}
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: LABEL[kind], path: "/gifts" }, { name: term.name, path: basePath }])} />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "All gifts", href: "/gifts" }, { name: term.name }]} />
      <div className="mt-4">
        <LandingHero eyebrow={LABEL[kind]} title={term.name} body={term.description ?? fallbackBody} image={img ? { src: unsplash(img.id, 1600, 600), alt: img.alt } : null} gradient={tileGradient(slug)}>
          <p className="text-sm text-white/70">{result.total.toLocaleString("en-IN")} gift{result.total === 1 ? "" : "s"} · price basis and MOQ shown on every card</p>
        </LandingHero>
      </div>
      <ul className="scroller mt-5" aria-label={`Other ${LABEL[kind].toLowerCase()} pages`}>
        {siblings.map((s) => <li key={s.slug}><Link href={`${PATH[kind]}/${s.slug}`} className="chip" aria-current={s.slug === slug ? "true" : undefined}>{s.name}</Link></li>)}
      </ul>
      <div className="mt-6 space-y-6">
        <ActiveFilterChips basePath={basePath} filters={{ ...filters, [kind]: undefined }} lookup={{ categories: tax.categories, recipients, occasions }} />
        <CatalogLayout filters={filters} basePath={basePath} query={query} total={result.total} aside={<ListingFilters basePath={basePath} filters={{ ...filters, [kind]: undefined }} categories={kind === "category" ? [] : tax.categories} recipients={kind === "recipient" ? [] : recipients} occasions={kind === "occasion" ? [] : occasions} hideCategory={kind === "category"} />}>
          <ListingGrid {...result} basePath={basePath} query={query} />
        </CatalogLayout>
      </div>
    </PageShell>
  );
}
