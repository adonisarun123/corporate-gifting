import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy notice", description: "How enquiry and account data is processed.", alternates: { canonical: "/privacy" } };

export default function Page() {
  return (
    <article className="prose-basic mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">Privacy notice</h1>
      <p><strong>Notice version 2026-09-01.</strong> We collect only the information needed for the current workflow: contact details to process an enquiry, delivery location for serviceability, and consent records. Marketing consent is separate and optional.</p><p>Suppliers receive only the requirement data assigned to them. Access, correction and deletion requests can be made through the contact page. Retention periods and applicable Indian data-protection obligations are to be confirmed with advisers before production.</p>
    </article>
  );
}
