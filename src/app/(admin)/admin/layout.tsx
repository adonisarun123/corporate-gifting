import Link from "next/link";
import { SiteHeader } from "@/components/layout/header";
import { requireStaff } from "./context";

export const dynamic = "force-dynamic";
const NAV = [["dashboard", "Dashboard"], ["catalog", "Catalogue"], ["approvals", "Approvals"], ["vendors", "Vendors"], ["enquiries", "Enquiries"], ["quotes", "Quotes"], ["content", "Content"], ["analytics", "Reports"], ["audit", "Audit"], ["settings", "Settings"]];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireStaff();
  return (
    <>
      <SiteHeader />
      <div className="container-x grid gap-8 py-8 lg:grid-cols-[220px_1fr]">
        <aside>
          <p className="text-xs uppercase tracking-wide text-ink-muted">Platform workspace</p>
          <p className="font-semibold">{actor.displayName}</p>
          <p className="text-xs text-ink-muted">{actor.platformRoles.join(", ")}</p>
          <nav aria-label="Admin" className="mt-4 grid gap-1 text-sm">{NAV.map(([p, l]) => <Link key={p} href={`/admin/${p}`} className="rounded-[var(--radius-control)] px-2 py-1.5 hover:bg-brand-soft">{l}</Link>)}</nav>
        </aside>
        <main id="main" className="min-w-0">{children}</main>
      </div>
    </>
  );
}
