import type { PublicProductDetail } from "@/modules/catalog/public";
import { env } from "@/lib/env";

/** Escapes `<` so untrusted product text cannot break out of the script element (spec §25, Next.js JSON-LD guidance). */
function safeJson(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(data) }} />;
}

/**
 * Quote-only Product markup: describes the gift with its public SKU and attributes.
 * Deliberately NO Offer with price 0, no fabricated reviews; a real public "from" price is expressed
 * only when the page shows one, with the qualifying quantity in the name of the offer.
 */
export function productJsonLd(p: PublicProductDetail): Record<string, unknown> {
  const url = `${env.APP_ORIGIN}/${p.kind === "combo" ? "combos" : "gifts"}/${p.slug}`;
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    url,
    name: p.name,
    sku: p.publicCode,
    description: p.shortSummary,
    image: p.gallery.map((g) => g.url),
    category: p.categoryName ?? undefined,
    additionalProperty: [
      ...p.content.specifications.map((s) => ({ "@type": "PropertyValue", name: s.name, value: s.unit ? `${s.value} ${s.unit}` : s.value })),
      ...(p.minMoq ? [{ "@type": "PropertyValue", name: "Minimum order quantity", value: `${p.minMoq} units` }] : []),
    ],
  };
  if (p.price.mode === "from" && p.price.unitPriceMinor !== null && p.price.qualifyingQuantity) {
    data.offers = {
      "@type": "Offer",
      name: `From price per unit for ${p.price.qualifyingQuantity} units${p.price.includesTax ? " (incl. GST)" : " (excl. GST)"}`,
      priceCurrency: "INR",
      price: (p.price.unitPriceMinor / 100).toFixed(2),
      eligibleQuantity: { "@type": "QuantitativeValue", minValue: p.price.qualifyingQuantity, unitText: "units" },
      businessFunction: "http://purl.org/goodrelations/v1#Sell",
      url,
    };
  }
  return data;
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${env.APP_ORIGIN}${it.path}` })),
  };
}

export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Corporate Gifting Hub",
    url: env.APP_ORIGIN,
  };
}
