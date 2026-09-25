import type { Metadata } from "next";

export const metadata: Metadata = { title: "How it works", description: "Shortlist gifts, send requirements, receive one tailored quotation.", alternates: { canonical: "/how-it-works" } };

export default function Page() {
  return (
    <article className="prose-basic mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">How it works</h1>
      <ol className="list-decimal space-y-3 pl-5"><li><strong>Shortlist.</strong> Add gifts or fixed kits to your enquiry cart with quantity, variant, branding and dates. Nothing is bought or reserved.</li><li><strong>Send requirements.</strong> Verify one contact channel and submit. You receive a reference number immediately after the record is committed.</li><li><strong>Sourcing.</strong> Our team confirms availability, cost and lead time with suppliers privately. Suppliers only see the requirements assigned to them.</li><li><strong>Quotation.</strong> You receive a versioned quotation with every inclusion stated. Revisions never overwrite an earlier version.</li><li><strong>Acceptance.</strong> Accept the current revision online. Order confirmation follows the agreed commercial checks (terms, artwork, purchase order or deposit as applicable).</li></ol>
    </article>
  );
}
