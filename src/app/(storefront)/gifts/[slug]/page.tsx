import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getPublishedProductBySlug } from "@/modules/catalog/public";
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
    alternates: { canonical: `/gifts/${p.slug}` },
    robots: p.content.seo?.noindex ? { index: false } : undefined,
    openGraph: { title: p.name, description: p.shortSummary, images: p.heroImage ? [{ url: p.heroImage.url, alt: p.heroImage.alt }] : [] },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const p = await getPublishedProductBySlug(slug);
  if (!p) {
    const target = await lookupRedirect(`/gifts/${slug}`);
    if (target) permanentRedirect(target);
    notFound();
  }
  if (p.kind !== "product") permanentRedirect(`/combos/${p.slug}`);
  return <ProductDetail p={p} />;
}
