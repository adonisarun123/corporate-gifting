import type { Metadata } from "next";
import { Breadcrumbs, PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = { title: "Terms", description: "Terms governing enquiries and quotations.", alternates: { canonical: "/terms" } };

export default function Page() {
  return (
    <PageShell><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Terms" }]} /><article className="prose-basic mx-auto mt-6 max-w-2xl"><h1 className="h-section mb-6">Terms</h1>
      <p>An enquiry is a request for quotation, not an order. A quotation is valid until its stated date and is superseded by any later revision. Acceptance of a quotation is subject to the commercial checks stated on it. Quotations are not tax invoices. Final legal seller and terms are to be confirmed before production.</p>
    </article></PageShell>
  );
}
