import { apiHandler, json, readJson } from "@/lib/api/handler";
import { applyCartCookie, resolveCartOwner } from "@/lib/api/cart-owner";
import { addItem, getCartView, getOrCreateCart } from "@/modules/carts/service";

export const GET = apiHandler(async (_req, { requestId }) => {
  const { owner } = await resolveCartOwner(requestId, false);
  const view = owner ? await getCartView(owner) : null;
  return json(view ?? { id: null, rowVersion: 0, items: [], knownSubtotalMinor: 0, hasUnknownCharges: false });
});

/** POST /carts/current → add a line (creates the cart if needed). */
export const POST = apiHandler(async (req, { requestId }) => {
  const { owner, setCookie } = await resolveCartOwner(requestId);
  await getOrCreateCart(owner!);
  await addItem(owner!, await readJson(req));
  const view = await getCartView(owner!);
  return applyCartCookie(json(view, { status: 201 }), setCookie);
});
