import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms", description: "Terms governing enquiries and quotations.", alternates: { canonical: "/terms" } };

export default function Page() {
  return (
    <article className="prose-basic mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">Terms</h1>
      <p>An enquiry is a request for quotation, not an order. A quotation is valid until its stated date and is superseded by any later revision. Acceptance of a quotation is subject to the commercial checks stated on it. Quotations are not tax invoices. Final legal seller and terms are to be confirmed before production.</p>
    </article>
  );
}
