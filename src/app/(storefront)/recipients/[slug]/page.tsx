import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listTaxonomy } from "@/modules/catalog/public";
import { parseListingSearchParams } from "@/components/catalog/listing";
import { TaxonomyLanding } from "@/components/catalog/landing";

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
  const sp = await searchParams;
  const filters = parseListingSearchParams(sp, { recipient: slug });
  return <TaxonomyLanding kind="recipient" slug={slug} term={term} filters={filters} filtered={Object.keys(sp).some((k) => k !== "page")} />;
}
