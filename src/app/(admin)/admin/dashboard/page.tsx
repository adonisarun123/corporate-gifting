import Link from "next/link";
import { requireStaff } from "../context";
import { getDashboardCounts } from "@/modules/analytics/service";

export default async function AdminDashboard() {
  const actor = await requireStaff();
  const c = await getDashboardCounts(actor);
  const cards = [
    { label: "New enquiries (submitted)", value: c.submittedEnquiries, href: "/admin/enquiries" },
    { label: "Enquiries in sourcing", value: c.sourcingEnquiries, href: "/admin/enquiries" },
    { label: "Revisions awaiting approval", value: c.pendingRevisions, href: "/admin/approvals" },
    { label: "Supplier requests overdue", value: c.overdueSupplierRequests, href: "/admin/enquiries" },
    { label: "Quotes issued, awaiting customer", value: c.openQuotes, href: "/admin/quotes" },
    { label: "Published products with stale/unknown stock", value: c.staleStockProducts, href: "/admin/catalog" },
    { label: "Outbox events dead-lettered", value: c.deadOutbox, href: "/admin/settings" },
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cards.map((x) => <li key={x.label}><Link href={x.href} className="card block p-4 hover:bg-brand-soft"><p className="text-3xl font-bold">{x.value}</p><p className="text-sm text-ink-muted">{x.label}</p></Link></li>)}</ul>
      <p className="text-sm text-ink-muted">All figures are live counts from the database. Enquiry value, quoted value and accepted value are reported separately under Reports; a cart estimate is never a sale.</p>
    </div>
  );
}
