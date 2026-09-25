import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cookies", description: "Cookies used by this site.", alternates: { canonical: "/cookies" } };

export default function Page() {
  return (
    <article className="prose-basic mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">Cookies</h1>
      <p>This site uses first-party, httpOnly cookies for your enquiry cart and sign-in session. No advertising cookies are set. Analytics, when enabled, uses an explicit event allowlist and no session replay.</p>
    </article>
  );
}
