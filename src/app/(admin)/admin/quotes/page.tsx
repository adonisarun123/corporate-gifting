import Link from "next/link";
import { requireStaff } from "../context";
import { listQuotesForPlatform } from "@/modules/quotes/service";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatINR } from "@/modules/pricing/money";

export default async function AdminQuotes() {
  const actor = await requireStaff();
  const rows = await listQuotesForPlatform(actor);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Quotes</h1>
      {rows.length === 0 ? <p className="text-sm text-ink-muted">No quotes yet. Draft one from an enquiry.</p> : (
        <table className="table"><thead><tr><th>Quote</th><th>Enquiry</th><th>Current revision</th><th>Status</th><th>Total</th></tr></thead>
          <tbody>{rows.map((q) => <tr key={q.id}><td><Link href={`/admin/quotes/${q.id}`} className="text-brand underline">{q.quoteNumber}</Link></td><td><Link href={`/admin/enquiries/${q.enquiryId}`} className="underline">{q.enquiryReference}</Link></td><td>R{String(q.revisionNo ?? 0).padStart(2, "0")}</td><td><StatusBadge status={q.status ?? "draft"} /></td><td>{q.totalMinor != null ? formatINR(q.totalMinor) : "—"}</td></tr>)}</tbody></table>
      )}
    </div>
  );
}
