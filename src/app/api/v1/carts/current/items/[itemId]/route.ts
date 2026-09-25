import { apiHandler, json, readJson } from "@/lib/api/handler";
import { resolveCartOwner } from "@/lib/api/cart-owner";
import { getCartView, removeItem, updateItem } from "@/modules/carts/service";
import { notFound } from "@/lib/errors";

export const PATCH = apiHandler<{ params: Promise<{ itemId: string }> }>(async (req, { params, requestId }) => {
  const { itemId } = await params;
  const { owner } = await resolveCartOwner(requestId, false);
  if (!owner) throw notFound("Cart not found");
  await updateItem(owner, itemId, await readJson(req));
  return json(await getCartView(owner));
});

export const DELETE = apiHandler<{ params: Promise<{ itemId: string }> }>(async (_req, { params, requestId }) => {
  const { itemId } = await params;
  const { owner } = await resolveCartOwner(requestId, false);
  if (!owner) throw notFound("Cart not found");
  await removeItem(owner, itemId);
  return json(await getCartView(owner));
});
