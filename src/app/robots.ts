import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

/** Crawl control only; authentication protects private data (spec §5, §24). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/search", "/enquiry-cart", "/enquiry/", "/account", "/vendor", "/admin", "/api/", "/quotes/", "/sign-in"] }],
    sitemap: `${env.APP_ORIGIN}/sitemap.xml`,
  };
}
