import { apiHandler, json } from "@/lib/api/handler";
import { listFiltersSchema, listPublishedProducts } from "@/modules/catalog/public";

export const GET = apiHandler(async (req) => {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const result = await listPublishedProducts(listFiltersSchema.parse({ q, page: req.nextUrl.searchParams.get("page") ?? "1" }));
  return json({ query: q, ...result }, { headers: { "cache-control": "public, s-maxage=30" } });
});
