import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { listPublishedSlugs, listTaxonomy } from "@/modules/catalog/public";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.APP_ORIGIN;
  const statics = ["", "/gifts", "/combos", "/gift-finder", "/how-it-works", "/about", "/contact", "/become-a-vendor", "/privacy", "/terms"].map((p) => ({ url: `${base}${p}`, lastModified: new Date() }));
  const products = (await listPublishedSlugs()).map((p) => ({ url: `${base}/${p.kind === "combo" ? "combos" : "gifts"}/${p.slug}`, lastModified: p.updatedAt }));
  const tax = await listTaxonomy();
  const cats = tax.categories.map((c) => ({ url: `${base}/categories/${c.slug}`, lastModified: new Date() }));
  const terms = tax.terms.filter((t) => t.kind === "occasion" || t.kind === "recipient").map((t) => ({ url: `${base}/${t.kind}s/${t.slug}`, lastModified: new Date() }));
  return [...statics, ...products, ...cats, ...terms];
}
