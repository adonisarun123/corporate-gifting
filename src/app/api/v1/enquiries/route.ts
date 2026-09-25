import { apiHandler, json, readJson } from "@/lib/api/handler";
import { resolveCartOwner } from "@/lib/api/cart-owner";
import { submitEnquiry } from "@/modules/enquiries/service";
import { businessRule, notFound } from "@/lib/errors";

/** POST /enquiries — requires an Idempotency-Key header (spec §9/§19). */
export const POST = apiHandler(async (req, { requestId }) => {
  const key = req.headers.get("idempotency-key");
  if (!key) throw businessRule("Idempotency-Key header is required", { "Idempotency-Key": ["required"] });
  const { owner } = await resolveCartOwner(requestId, false);
  if (!owner) throw notFound("Cart not found");
  const result = await submitEnquiry(owner, key, await readJson(req));
  return json(result, { status: 201 });
});
