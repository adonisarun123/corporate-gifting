import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, PageShell } from "@/components/layout/page-shell";
import { IconCheck, IconDoc, IconGift, IconShield, IconUsers } from "@/components/ui/icons";

export const metadata: Metadata = { title: "How it works", description: "Shortlist gifts, send requirements, receive one tailored quotation.", alternates: { canonical: "/how-it-works" } };

const STEPS = [
  { icon: IconGift, title: "Shortlist", body: "Add gifts or fixed kits to your enquiry cart with quantity, variant, branding and dates. Nothing is bought or reserved.", detail: ["Prices shown are indicative and state their basis", "Lines with different branding or dates stay separate", "The cart survives reloads; no account needed"] },
  { icon: IconDoc, title: "Send requirements", body: "Verify one contact channel and submit. You receive a reference number immediately after the record is committed.", detail: ["Contact, company, recipient count and delivery PIN", "Budget basis: with or without GST and branding", "Your brief is frozen as an immutable snapshot"] },
  { icon: IconUsers, title: "Sourcing", body: "Our team confirms availability, cost and lead time with suppliers privately. Suppliers only see the requirements assigned to them.", detail: ["Several suppliers can back one gift", "Cost, stock freshness and reliability compared", "Multi-vendor kits planned with assembly and QC owners"] },
  { icon: IconShield, title: "Quotation and acceptance", body: "You receive a versioned quotation with every inclusion stated. Accept the current revision online; order confirmation follows the agreed commercial checks.", detail: ["Revisions never overwrite an earlier version", "GST, setup, branding and shipping itemised", "Acceptance records the exact document and terms"] },
];

export default function Page() {
  return (
    <PageShell>
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "How it works" }]} />
      <div className="mt-4 max-w-2xl"><p className="eyebrow">Process</p><h1 className="h-section mt-2">How an enquiry becomes a quotation</h1><p className="lede mt-3">There is no checkout. You tell us what you need; we do the sourcing and return one document you can accept.</p></div>
      <ol className="mt-10 grid gap-6 lg:grid-cols-2">
        {STEPS.map((s, i) => (
          <li key={s.title} className="card-elevated relative overflow-hidden p-6 sm:p-8">
            <span className="absolute -right-2 -top-4 font-display text-[6rem] font-extrabold leading-none text-brand-soft">{i + 1}</span>
            <span className="relative grid h-12 w-12 place-items-center rounded-xl bg-brand text-white"><s.icon /></span>
            <h2 className="relative mt-5 text-xl font-bold">{s.title}</h2>
            <p className="relative mt-2 text-ink-muted">{s.body}</p>
            <ul className="relative mt-4 space-y-1.5 text-sm">{s.detail.map((d) => <li key={d} className="flex items-start gap-2"><IconCheck width={16} height={16} className="mt-0.5 shrink-0 text-brand" />{d}</li>)}</ul>
          </li>
        ))}
      </ol>
      <div className="dark-panel mt-10 flex flex-col items-start justify-between gap-4 rounded-[20px] p-8 sm:flex-row sm:items-center">
        <div><h2 className="font-display text-2xl font-bold text-white">Start with a shortlist or a brief</h2><p className="mt-1 text-white/75">Either route ends in the same quotation.</p></div>
        <div className="flex gap-3"><Link href="/gifts" className="btn-inverse">Browse gifts</Link><Link href="/contact" className="inline-flex items-center rounded-[10px] border border-white/30 px-4 font-semibold text-white hover:bg-white/10">Send a brief</Link></div>
      </div>
    </PageShell>
  );
}
