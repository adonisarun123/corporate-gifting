import type { Metadata } from "next";
import { listPublishedProducts, listTaxonomy } from "@/modules/catalog/public";
import { ListingFilters, ListingGrid, parseListingSearchParams } from "@/components/catalog/listing";

export const metadata: Metadata = { title: "All corporate gifts", description: "Browse individual corporate gifts with clear price basis, minimum order quantities and lead times.", alternates: { canonical: "/gifts" } };

export default async function GiftsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const filters = parseListingSearchParams(sp, { kind: "product" });
  const [result, tax] = await Promise.all([listPublishedProducts(filters), listTaxonomy()]);
  const filtered = Object.keys(sp).some((k) => k !== "page");
  return (
    <div className="space-y-6">
      {filtered && <meta name="robots" content="noindex,follow" />}
      <h1 className="text-2xl font-bold">All gifts</h1>
      <ListingFilters basePath="/gifts" filters={filters} categories={tax.categories} recipients={tax.terms.filter((t) => t.kind === "recipient")} occasions={tax.terms.filter((t) => t.kind === "occasion")} />
      <ListingGrid {...result} basePath="/gifts" query={{ q: filters.q, category: filters.category, recipient: filters.recipient, occasion: filters.occasion, quantity: filters.quantity?.toString(), sort: filters.sort }} />
    </div>
  );
}
