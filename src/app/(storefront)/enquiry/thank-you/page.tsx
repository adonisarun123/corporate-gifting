import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { IconCheck } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Enquiry received", robots: { index: false } };

export default async function ThankYouPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  return (
    <PageShell className="py-16">
      <div className="card-elevated mx-auto max-w-xl p-8 text-center sm:p-10">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success-soft text-success"><IconCheck width={28} height={28} /></span>
        <h1 className="mt-5 font-display text-2xl font-bold sm:text-3xl">Thank you — your enquiry is recorded</h1>
        {ref && <p className="mt-4 inline-block rounded-lg bg-brand-tint px-4 py-2 font-mono text-lg font-semibold text-brand-strong">{ref}</p>}
        <p className="mt-4 text-sm text-ink-muted">Keep this reference for correspondence. It is not a login: access to your quotation arrives by a secure, expiring link to your verified e-mail.</p>
        <ol className="mt-6 grid gap-2 text-left text-sm sm:grid-cols-3">
          {[["Review", "Our team qualifies the brief during business hours (IST)."], ["Sourcing", "Availability, cost and lead time confirmed with suppliers."], ["Quotation", "One versioned document with every inclusion stated."]].map(([t, b], i) => <li key={t} className="card p-3"><span className="step-no h-6 w-6 text-xs">{i + 1}</span><p className="mt-2 font-semibold">{t}</p><p className="text-xs text-ink-muted">{b}</p></li>)}
        </ol>
        <div className="mt-6 flex justify-center gap-2"><Link href="/gifts" className="btn-secondary">Continue browsing</Link><Link href="/" className="btn-primary">Home</Link></div>
      </div>
    </PageShell>
  );
}
