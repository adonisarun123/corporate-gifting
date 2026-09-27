import type { Metadata } from "next";
import { resolveCartOwner } from "@/lib/api/cart-owner";
import { getRequestId } from "@/lib/auth/session";
import { getCartView } from "@/modules/carts/service";
import { CartClient } from "@/components/enquiry/cart-client";
import { Breadcrumbs, PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = { title: "Enquiry cart", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function EnquiryCartPage() {
  const { owner } = await resolveCartOwner(await getRequestId(), false);
  const cart = owner ? await getCartView(owner) : null;
  return (
    <PageShell>
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Enquiry cart" }]} />
      <div className="mt-4 mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow">Step 1 of 2</p><h1 className="h-section mt-2">Enquiry cart</h1><p className="mt-2 max-w-2xl text-ink-muted">A structured procurement brief, not a checkout. Estimates are recalculated on the server; unknown costs stay “to be confirmed” rather than counting as zero.</p></div>
        <ol className="flex items-center gap-2 text-xs font-semibold">
          <li className="flex items-center gap-1.5"><span className="step-no h-6 w-6 text-xs">1</span> Review lines</li><li aria-hidden className="h-px w-6 bg-border" />
          <li className="flex items-center gap-1.5 text-ink-muted"><span className="step-no h-6 w-6 bg-border text-xs text-ink-muted">2</span> Send requirements</li>
        </ol>
      </div>
      <CartClient initial={cart} />
    </PageShell>
  );
}
