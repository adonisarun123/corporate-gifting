import Link from "next/link";
import { SiteHeader } from "@/components/layout/header";
import { requireVendorContext } from "./context";

export const dynamic = "force-dynamic";

const NAV = [["dashboard", "Dashboard"], ["products", "Products"], ["inventory", "Inventory"], ["pricing", "Pricing"], ["requests", "Requests"], ["imports", "Imports"], ["activity", "Activity"], ["settings", "Settings"]];

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const { membership, memberships } = await requireVendorContext();
  return (
    <>
      <SiteHeader />
      <div className="container-x grid gap-8 py-8 lg:grid-cols-[220px_1fr]">
        <aside>
          <p className="text-xs uppercase tracking-wide text-ink-muted">Vendor workspace</p>
          <p className="font-semibold">{membership.vendorName}</p>
          <p className="text-xs text-ink-muted">{membership.vendorCode} · {membership.role}</p>
          {memberships.length > 1 && <ul className="mt-2 text-xs">{memberships.map((m) => <li key={m.vendorId}><Link href={`/vendor/dashboard?vendor=${m.vendorId}`} className="text-brand underline">{m.vendorName}</Link></li>)}</ul>}
          <nav aria-label="Vendor" className="mt-4 grid gap-1 text-sm">{NAV.map(([p, l]) => <Link key={p} href={`/vendor/${p}`} className="rounded-[var(--radius-control)] px-2 py-1.5 hover:bg-brand-soft">{l}</Link>)}</nav>
        </aside>
        <main id="main" className="min-w-0">{children}</main>
      </div>
    </>
  );
}
