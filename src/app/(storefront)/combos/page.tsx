import type { Metadata } from "next";
import Link from "next/link";
import { listPublishedProducts, listTaxonomy } from "@/modules/catalog/public";
import { ActiveFilterChips, CatalogLayout, ListingFilters, ListingGrid, filtersToQuery, parseListingSearchParams } from "@/components/catalog/listing";
import { Breadcrumbs, PageShell } from "@/components/layout/page-shell";
import { IconBox, IconBrush, IconDoc } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Curated gift kits and combos", description: "Fixed gift kits with a versioned bill of materials, price per kit and clear assembly details.", alternates: { canonical: "/combos" } };

export default async function CombosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const filters = parseListingSearchParams(sp, { kind: "combo" });
  const [result, tax] = await Promise.all([listPublishedProducts(filters), listTaxonomy()]);
  const recipients = tax.terms.filter((t) => t.kind === "recipient");
  const occasions = tax.terms.filter((t) => t.kind === "occasion");
  const query = filtersToQuery(filters);
  return (
    <PageShell>
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Kits & combos" }]} />
      <div className="mt-4 grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div><p className="eyebrow">Ready kits</p><h1 className="h-section mt-2">Kits and combos</h1><p className="mt-2 max-w-2xl text-ink-muted">Each kit lists every component and quantity, its packaging, and whether it ships assembled. Configurable and build-your-own kits are planned; today every kit is fixed — ask us for a bespoke composition.</p></div>
        <ul className="grid grid-cols-3 gap-2 text-xs">
          {[[IconBox, "Bill of materials", "Every component listed"], [IconBrush, "One branding brief", "Across all components"], [IconDoc, "Priced per kit", "MOQ in kits"]].map(([I, t, b]) => {
            const Icon = I as typeof IconBox;
            return <li key={t as string} className="card flex flex-col items-start gap-1.5 p-3"><span className="text-brand"><Icon width={18} height={18} /></span><span className="font-semibold text-ink">{t as string}</span><span className="text-ink-muted">{b as string}</span></li>;
          })}
        </ul>
      </div>
      <div className="mt-6 space-y-6">
        <ActiveFilterChips basePath="/combos" filters={filters} lookup={{ recipients, occasions }} />
        <CatalogLayout filters={filters} basePath="/combos" query={query} total={result.total} aside={<ListingFilters basePath="/combos" filters={filters} recipients={recipients} occasions={occasions} hideCategory />}>
          <ListingGrid {...result} basePath="/combos" query={query} />
          <div className="card mt-8 flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
            <div><h2 className="font-bold">Need a kit that is not here?</h2><p className="mt-1 text-sm text-ink-muted">Send the recipient, count, budget and date. We propose a composition within your constraints.</p></div>
            <Link href="/contact" className="btn-primary">Send a sourcing brief</Link>
          </div>
        </CatalogLayout>
      </div>
    </PageShell>
  );
}
