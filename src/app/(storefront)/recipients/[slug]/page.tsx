import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listPublishedProducts, listTaxonomy } from "@/modules/catalog/public";
import { ListingGrid, parseListingSearchParams } from "@/components/catalog/listing";
import { JsonLd, breadcrumbJsonLd } from "@/seo/jsonld";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

async function resolve(slug: string) {
  const tax = await listTaxonomy();
  return tax.terms.find((t) => t.kind === "recipient" && t.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const term = await resolve(slug);
  if (!term) return {};
  return { title: `${term.name} corporate gifts`, description: term.description ?? `Corporate gifts for ${term.name.toLowerCase()} with clear price basis, MOQ and lead times.`, alternates: { canonical: `/recipients/${slug}` } };
}

export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  const term = await resolve(slug);
  if (!term) notFound();
  const filters = parseListingSearchParams(await searchParams, { recipient: slug });
  const result = await listPublishedProducts(filters);
  return (
    <div className="space-y-6">
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Recipient", path: "/gifts" }, { name: term.name, path: `/recipients/${slug}` }])} />
      <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">Home / Recipient / {term.name}</nav>
      <h1 className="text-2xl font-bold">{term.name}</h1>
      {term.description && <p className="max-w-prose text-ink-muted">{term.description}</p>}
      <ListingGrid {...result} basePath={`/recipients/${slug}`} query={{ sort: filters.sort }} />
    </div>
  );
}
