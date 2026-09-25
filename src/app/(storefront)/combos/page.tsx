import type { Metadata } from "next";
import { listPublishedProducts, listTaxonomy } from "@/modules/catalog/public";
import { ListingFilters, ListingGrid, parseListingSearchParams } from "@/components/catalog/listing";

export const metadata: Metadata = { title: "Curated gift combos and kits", description: "Fixed gift kits with a versioned bill of materials, price per kit and clear assembly details.", alternates: { canonical: "/combos" } };

export default async function CombosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const filters = parseListingSearchParams(sp, { kind: "combo" });
  const [result, tax] = await Promise.all([listPublishedProducts(filters), listTaxonomy()]);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Curated combos</h1>
      <p className="max-w-prose text-ink-muted">Each kit lists every component and quantity. Configurable and build-your-own kits are planned; today all combos are fixed.</p>
      <ListingFilters basePath="/combos" filters={filters} categories={tax.categories} recipients={tax.terms.filter((t) => t.kind === "recipient")} occasions={tax.terms.filter((t) => t.kind === "occasion")} />
      <ListingGrid {...result} basePath="/combos" query={{ q: filters.q, recipient: filters.recipient, occasion: filters.occasion, quantity: filters.quantity?.toString(), sort: filters.sort }} />
    </div>
  );
}
