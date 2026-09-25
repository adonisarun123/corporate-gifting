import { apiHandler, json } from "@/lib/api/handler";
import { listFiltersSchema, listPublishedProducts } from "@/modules/catalog/public";

/** Public allowlisted DTO; short bounded freshness. */
export const GET = apiHandler(async (req) => {
  const filters = listFiltersSchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const result = await listPublishedProducts(filters);
  return json(result, { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } });
});
