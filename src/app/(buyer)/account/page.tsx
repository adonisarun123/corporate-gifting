import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth/session";
import { isAuthenticated } from "@/modules/identity/actor";
import { listMyEnquiries } from "@/modules/enquiries/service";
import { listMyQuotes } from "@/modules/quotes/service";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatINR } from "@/modules/pricing/money";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const actor = await getActor();
  if (!isAuthenticated(actor)) redirect("/sign-in?next=/account");
  const [enqs, quotes] = await Promise.all([listMyEnquiries(actor), listMyQuotes(actor)]);
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Hello, {actor.displayName}</h1><p className="text-sm text-ink-muted">{actor.email}</p></div>
        <form action="/sign-out" method="post"><button className="btn-secondary" type="submit">Sign out</button></form>
      </div>
      <section><h2 className="text-lg font-semibold">Your enquiries</h2>
        {enqs.length === 0 ? <p className="mt-2 text-sm text-ink-muted">No enquiries yet. Enquiries submitted as a guest are linked by e-mail verification and quote links, not shown here.</p> : (
          <table className="table mt-2"><thead><tr><th>Reference</th><th>Status</th><th>Recipients</th><th>Submitted</th></tr></thead>
            <tbody>{enqs.map((e) => <tr key={e.id}><td>{e.reference}</td><td><StatusBadge status={e.status} /></td><td>{e.recipientCount}</td><td>{e.submittedAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</td></tr>)}</tbody></table>
        )}</section>
      <section><h2 className="text-lg font-semibold">Your quotations</h2>
        {quotes.length === 0 ? <p className="mt-2 text-sm text-ink-muted">No issued quotations yet.</p> : (
          <table className="table mt-2"><thead><tr><th>Quote</th><th>Enquiry</th><th>Status</th><th>Total</th><th>Valid until</th><th></th></tr></thead>
            <tbody>{quotes.map((q) => <tr key={q.id}><td>{q.quoteNumber}-R{String(q.revisionNo).padStart(2, "0")}</td><td>{q.enquiryReference}</td><td><StatusBadge status={q.status} /></td><td>{formatINR(q.totalMinor)}</td><td>{q.validUntil?.toLocaleDateString("en-IN") ?? "—"}</td><td><Link href={`/quotes/${q.id}`} className="text-brand underline">View</Link></td></tr>)}</tbody></table>
        )}</section>
    </div>
  );
}
