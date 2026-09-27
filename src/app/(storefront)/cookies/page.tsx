import type { Metadata } from "next";
import { Breadcrumbs, PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = { title: "Cookies", description: "Cookies used by this site.", alternates: { canonical: "/cookies" } };

export default function Page() {
  return (
    <PageShell><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Cookies" }]} /><article className="prose-basic mx-auto mt-6 max-w-2xl"><h1 className="h-section mb-6">Cookies</h1>
      <p>This site uses first-party, httpOnly cookies for your enquiry cart and sign-in session. No advertising cookies are set. Analytics, when enabled, uses an explicit event allowlist and no session replay.</p>
    </article></PageShell>
  );
}
