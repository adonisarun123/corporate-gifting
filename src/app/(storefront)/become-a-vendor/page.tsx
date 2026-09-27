import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, PageShell } from "@/components/layout/page-shell";
import { IconBox, IconCheck, IconDoc, IconShield, IconTag } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Become a vendor", description: "Apply to supply gifts through Corporate Gifting Hub.", alternates: { canonical: "/become-a-vendor" } };

const POINTS = [
  { icon: IconTag, title: "You set supply costs", body: "Maintain your own cost tiers, MOQ, quantity increments and lead times. We control the customer selling price; your costs are never public." },
  { icon: IconBox, title: "Your stock, your update", body: "Declare stock or production capacity with a freshness timestamp. Validated stock changes apply immediately to sourcing eligibility." },
  { icon: IconDoc, title: "Requests, not spam", body: "You receive only the requirements assigned to you — quantity, branding spec, region and response deadline — and respond with versioned terms." },
  { icon: IconShield, title: "Private by design", body: "Supplier SKUs, costs and documents are scoped to your organisation with row-level security. Other vendors never see them." },
];

export default function Page() {
  return (
    <PageShell>
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Become a vendor" }]} />
      <div className="mt-4 max-w-2xl"><p className="eyebrow">Suppliers</p><h1 className="h-section mt-2">Supply corporate gifts through one buyer</h1><p className="lede mt-3">Vendors keep their own products, stock, lead times and costs current in a private portal. Public content is reviewed before publication; your procurement costs and SKUs are never shown to customers.</p></div>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {POINTS.map((p) => <li key={p.title} className="card p-6"><span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand"><p.icon /></span><h2 className="mt-4 font-bold">{p.title}</h2><p className="mt-1.5 text-sm text-ink-muted">{p.body}</p></li>)}
      </ul>
      <div className="card-elevated mt-8 grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <h2 className="text-xl font-bold">How onboarding works</h2>
          <ol className="mt-3 grid gap-2 text-sm text-ink-muted sm:grid-cols-2">
            {["Apply with legal name, categories and serviceable regions", "Verification of business documents (stored privately)", "Approval and manager invitations by e-mail", "Add products, variants, cost tiers and stock", "Public content reviewed and published by our team"].map((s, i) => <li key={s} className="flex gap-2"><span className="step-no h-6 w-6 shrink-0 text-xs">{i + 1}</span>{s}</li>)}
          </ol>
        </div>
        <div className="flex flex-col gap-2">
          <Link href="/contact" className="btn-primary btn-lg">Apply to supply</Link>
          <p className="flex items-center gap-1.5 text-xs text-ink-muted"><IconCheck width={14} height={14} className="text-success" /> Applications are approved by our team.</p>
        </div>
      </div>
    </PageShell>
  );
}
