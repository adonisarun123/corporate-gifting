import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, PageShell } from "@/components/layout/page-shell";
import { IconClock, IconDoc, IconGift, IconMail, IconUsers } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Contact", description: "Reach the Corporate Gifting Hub team for sourcing briefs, quotes and vendor enquiries.", alternates: { canonical: "/contact" } };

export default function Page() {
  return (
    <PageShell>
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Contact" }]} />
      <div className="mt-4 grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="eyebrow">Contact</p>
          <h1 className="h-section mt-2">Talk to the team</h1>
          <p className="lede mt-3">For a sourcing brief without a product selection, tell us the recipient, count, budget and date. For anything about an existing enquiry, quote the reference number.</p>
          <dl className="mt-8 space-y-4 text-sm">
            <div className="flex gap-3"><span className="text-brand"><IconClock /></span><div><dt className="font-semibold">Operating hours</dt><dd className="text-ink-muted">Monday to Friday, business hours (IST). Response-time commitments are published once confirmed.</dd></div></div>
            <div className="flex gap-3"><span className="text-brand"><IconMail /></span><div><dt className="font-semibold">Email and phone</dt><dd className="text-ink-muted">Published on this page at launch, once the brand and legal seller are confirmed. Until then, the brief form below reaches the team directly.</dd></div></div>
            <div className="flex gap-3"><span className="text-brand"><IconUsers /></span><div><dt className="font-semibold">Suppliers</dt><dd className="text-ink-muted"><Link href="/become-a-vendor" className="text-brand underline">Apply to supply</Link> through the vendor portal.</dd></div></div>
          </dl>
        </div>
        <div className="grid gap-4">
          <Link href="/enquiry-cart?brief=1" className="card-elevated card-hover flex gap-4 p-6">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand text-white"><IconDoc /></span>
            <div><h2 className="text-lg font-bold">Send a sourcing brief</h2><p className="mt-1 text-sm text-ink-muted">No product in mind? Submit an enquiry with your requirements only. We propose gifts or a kit within your constraints and come back with one quotation.</p><span className="mt-3 inline-block text-sm font-semibold text-brand">Start a brief →</span></div>
          </Link>
          <Link href="/gifts" className="card card-hover flex gap-4 p-6">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><IconGift /></span>
            <div><h2 className="text-lg font-bold">Shortlist from the catalogue</h2><p className="mt-1 text-sm text-ink-muted">Add gifts or kits to the enquiry cart with quantity, branding and dates, then send everything at once.</p><span className="mt-3 inline-block text-sm font-semibold text-brand">Browse gifts →</span></div>
          </Link>
          <div className="card p-6 text-sm">
            <h2 className="font-bold">What helps us quote faster</h2>
            <ul className="mt-2 grid gap-1.5 text-ink-muted sm:grid-cols-2">
              {["Recipient type and headcount", "Occasion and required-by date", "Budget per gift and its basis (GST, branding)", "Delivery city or PIN codes", "Logo file or brand colours", "Any items to avoid (food, fragile, electronics)"].map((t) => <li key={t}>· {t}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
