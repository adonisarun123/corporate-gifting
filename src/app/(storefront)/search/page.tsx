import type { Metadata } from "next";
import { listPublishedProducts, listFiltersSchema } from "@/modules/catalog/public";
import { ListingGrid } from "@/components/catalog/listing";

export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const page = typeof sp.page === "string" ? sp.page : "1";
  const result = await listPublishedProducts(listFiltersSchema.parse({ q, page }));
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Search results{q ? ` for “${q}”` : ""}</h1>
      <ListingGrid {...result} basePath="/search" query={{ q }} />
    </div>
  );
}
