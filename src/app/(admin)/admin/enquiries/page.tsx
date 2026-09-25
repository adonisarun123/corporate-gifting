import Link from "next/link";
import { requireStaff } from "../context";
import { listEnquiriesForPlatform } from "@/modules/enquiries/service";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function AdminEnquiries() {
  const actor = await requireStaff();
  const rows = await listEnquiriesForPlatform(actor);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Enquiries</h1>
      {rows.length === 0 ? <p className="text-sm text-ink-muted">No enquiries yet.</p> : (
        <table className="table"><thead><tr><th>Reference</th><th>Company</th><th>Contact</th><th>Recipients</th><th>Needed by</th><th>Status</th><th>Submitted</th></tr></thead>
          <tbody>{rows.map((e) => <tr key={e.id}><td><Link href={`/admin/enquiries/${e.id}`} className="text-brand underline">{e.reference}</Link></td><td>{e.companyName}</td><td>{e.contactName}</td><td>{e.recipientCount}</td><td>{e.requestedDeliveryDate ?? "—"}</td><td><StatusBadge status={e.status} /></td><td className="text-xs">{e.submittedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td></tr>)}</tbody></table>
      )}
    </div>
  );
}
