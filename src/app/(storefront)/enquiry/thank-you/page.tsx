import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Enquiry received", robots: { index: false } };

export default async function ThankYouPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  return (
    <div className="card mx-auto max-w-xl p-8 text-center">
      <h1 className="text-2xl font-bold">Thank you — your enquiry is recorded</h1>
      {ref && <p className="mt-3 text-lg">Reference <strong>{ref}</strong></p>}
      <p className="mt-3 text-sm text-ink-muted">Keep this reference for correspondence. It is not a login: access to your quotation arrives by a secure, expiring link to your verified e-mail.</p>
      <p className="mt-3 text-sm text-ink-muted">Our team reviews enquiries during business hours (IST) and will confirm availability with suppliers before issuing a quotation.</p>
      <div className="mt-6 flex justify-center gap-2"><Link href="/gifts" className="btn-secondary">Continue browsing</Link><Link href="/" className="btn-primary">Home</Link></div>
    </div>
  );
}
