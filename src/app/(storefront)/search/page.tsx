import type { Metadata } from "next";
import { listPublishedProducts, listTaxonomy } from "@/modules/catalog/public";
import { ActiveFilterChips, CatalogLayout, ListingFilters, ListingGrid, filtersToQuery, parseListingSearchParams } from "@/components/catalog/listing";
import { Breadcrumbs, PageShell } from "@/components/layout/page-shell";
import { IconSearch } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const filters = parseListingSearchParams(sp);
  const [result, tax] = await Promise.all([listPublishedProducts(filters), listTaxonomy()]);
  const recipients = tax.terms.filter((t) => t.kind === "recipient");
  const occasions = tax.terms.filter((t) => t.kind === "occasion");
  const query = filtersToQuery(filters);
  return (
    <PageShell>
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Search" }]} />
      <div className="mt-4 max-w-2xl">
        <p className="eyebrow">Search</p>
        <h1 className="h-section mt-2">{filters.q ? <>Results for “{filters.q}”</> : "Search the catalogue"}</h1>
        <form action="/search" role="search" className="mt-4 flex gap-2">
          <label htmlFor="s-q" className="sr-only">Search gifts</label>
          <div className="relative flex-1"><IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" /><input id="s-q" name="q" type="search" defaultValue={filters.q ?? ""} placeholder="Product name, category or code" className="input h-12 pl-10" /></div>
          <button type="submit" className="btn-primary">Search</button>
        </form>
        <p className="mt-2 text-xs text-ink-muted">Synonyms such as “joining kit”, “welcome kit” and “onboarding kit” are treated alike. Public codes (CGH-P-…) match exactly.</p>
      </div>
      <div className="mt-8 space-y-6">
        <ActiveFilterChips basePath="/search" filters={filters} lookup={{ categories: tax.categories, recipients, occasions }} />
        <CatalogLayout filters={filters} basePath="/search" query={query} total={result.total} aside={<ListingFilters basePath="/search" filters={filters} categories={tax.categories} recipients={recipients} occasions={occasions} />}>
          <ListingGrid {...result} basePath="/search" query={query} />
        </CatalogLayout>
      </div>
    </PageShell>
  );
}
