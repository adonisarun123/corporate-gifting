import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getPublishedProductBySlug, listFiltersSchema, listPublishedProducts } from "@/modules/catalog/public";
import { ProductDetail } from "@/components/catalog/product-detail";
import { lookupRedirect } from "@/modules/catalog/redirects";

export const revalidate = 300;
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPublishedProductBySlug(slug);
  if (!p) return {};
  return {
    title: p.content.seo?.title ?? p.name,
    description: p.content.seo?.description ?? p.shortSummary,
    alternates: { canonical: `/combos/${p.slug}` },
    robots: p.content.seo?.noindex ? { index: false } : undefined,
    openGraph: { title: p.name, description: p.shortSummary, images: p.heroImage ? [{ url: p.heroImage.url, alt: p.heroImage.alt }] : [] },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const p = await getPublishedProductBySlug(slug);
  if (!p) {
    const target = await lookupRedirect(`/combos/${slug}`);
    if (target) permanentRedirect(target);
    notFound();
  }
  if (p.kind !== "combo") permanentRedirect(`/gifts/${p.slug}`);
  const related = await listPublishedProducts(listFiltersSchema.parse({ kind: "combo", sort: "newest" }));
  return <ProductDetail p={p} related={related.items.filter((r) => r.id !== p.id)} />;
}
