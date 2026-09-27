import type { Metadata } from "next";
import { Breadcrumbs, PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = { title: "Privacy notice", description: "How enquiry and account data is processed.", alternates: { canonical: "/privacy" } };

export default function Page() {
  return (
    <PageShell><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Privacy notice" }]} /><article className="prose-basic mx-auto mt-6 max-w-2xl"><h1 className="h-section mb-6">Privacy notice</h1>
      <p><strong>Notice version 2026-09-01.</strong> We collect only the information needed for the current workflow: contact details to process an enquiry, delivery location for serviceability, and consent records. Marketing consent is separate and optional.</p><p>Suppliers receive only the requirement data assigned to them. Access, correction and deletion requests can be made through the contact page. Retention periods and applicable Indian data-protection obligations are to be confirmed with advisers before production.</p>
    </article></PageShell>
  );
}
