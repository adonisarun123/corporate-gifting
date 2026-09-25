import type { Metadata } from "next";
import { resolveCartOwner } from "@/lib/api/cart-owner";
import { getRequestId } from "@/lib/auth/session";
import { getCartView } from "@/modules/carts/service";
import { CartClient } from "@/components/enquiry/cart-client";

export const metadata: Metadata = { title: "Enquiry cart", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function EnquiryCartPage() {
  const { owner } = await resolveCartOwner(await getRequestId(), false);
  const cart = owner ? await getCartView(owner) : null;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Enquiry cart</h1>
      <p className="max-w-prose text-sm text-ink-muted">A structured procurement brief. Estimates are recalculated on the server; unknown costs stay “to be confirmed” rather than counting as zero.</p>
      <CartClient initial={cart} />
    </div>
  );
}
