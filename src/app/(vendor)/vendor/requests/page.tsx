import Link from "next/link";
import { requireVendorContext } from "../context";
import { listVendorRequests } from "@/modules/sourcing/service";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function VendorRequests() {
  const { actor, membership } = await requireVendorContext();
  const rows = await listVendorRequests(actor, membership.vendorId);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Supplier requests</h1>
      <p className="text-sm text-ink-muted">Each request contains only the requirements assigned to you. Customer identity is shared only when explicitly released.</p>
      {rows.length === 0 ? <p className="text-sm text-ink-muted">No requests yet.</p> : (
        <table className="table"><thead><tr><th>Reference</th><th>Status</th><th>Due</th><th>Region</th><th>Needed by</th><th></th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id}><td>{r.reference}</td><td><StatusBadge status={r.status} /></td><td>{r.dueAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td><td>{r.deliveryRegion}</td><td>{r.neededByDate ?? "—"}</td><td><Link href={`/vendor/requests/${r.id}`} className="text-brand underline">Open</Link></td></tr>)}</tbody></table>
      )}
    </div>
  );
}
