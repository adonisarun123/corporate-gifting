import { apiHandler, json } from "@/lib/api/handler";
import { getPublishedProductBySlug } from "@/modules/catalog/public";
import { notFound } from "@/lib/errors";

export const GET = apiHandler<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  const qty = req.nextUrl.searchParams.get("quantity");
  const product = await getPublishedProductBySlug(id, qty ? Number(qty) : null);
  if (!product) throw notFound("Product not found");
  return json(product, { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } });
});
