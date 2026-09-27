import type { Metadata } from "next";
import { listPublishedProducts, listTaxonomy } from "@/modules/catalog/public";
import { ActiveFilterChips, CatalogLayout, ListingFilters, ListingGrid, filtersToQuery, parseListingSearchParams } from "@/components/catalog/listing";
import { Breadcrumbs, PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = { title: "All corporate gifts", description: "Browse individual corporate gifts with clear price basis, minimum order quantities and lead times.", alternates: { canonical: "/gifts" } };

export default async function GiftsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const filters = parseListingSearchParams(sp, { kind: "product" });
  const [result, tax] = await Promise.all([listPublishedProducts(filters), listTaxonomy()]);
  const filtered = Object.keys(sp).some((k) => k !== "page");
  const recipients = tax.terms.filter((t) => t.kind === "recipient");
  const occasions = tax.terms.filter((t) => t.kind === "occasion");
  const query = filtersToQuery(filters);
  return (
    <PageShell>
      {filtered && <meta name="robots" content="noindex,follow" />}
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "All gifts" }]} />
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow">Catalogue</p><h1 className="h-section mt-2">All gifts</h1><p className="mt-2 max-w-2xl text-ink-muted">Individual gifts with their price basis, minimum order quantity, lead time and branding options. Enter your quantity to see the price tier that applies.</p></div>
      </div>
      <div className="mt-6 space-y-6">
        <ActiveFilterChips basePath="/gifts" filters={filters} lookup={{ categories: tax.categories, recipients, occasions }} />
        <CatalogLayout filters={filters} basePath="/gifts" query={query} total={result.total} aside={<ListingFilters basePath="/gifts" filters={filters} categories={tax.categories} recipients={recipients} occasions={occasions} />}>
          <ListingGrid {...result} basePath="/gifts" query={query} />
        </CatalogLayout>
      </div>
    </PageShell>
  );
}
