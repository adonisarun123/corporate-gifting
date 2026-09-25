import { requireVendorContext } from "../context";
import { listAuditEvents } from "@/modules/audit/read";

export default async function VendorActivity() {
  const { actor, membership } = await requireVendorContext();
  const rows = await listAuditEvents(actor, { vendorId: membership.vendorId, limit: 200 });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Activity</h1>
      <p className="text-sm text-ink-muted">Your organisation&apos;s change history (redacted: field names only). Competitor data is never included.</p>
      <table className="table"><thead><tr><th>When</th><th>Action</th><th>Entity</th><th>Fields changed</th><th>Reason</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id}><td className="whitespace-nowrap text-xs">{r.occurredAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td><td>{r.action}</td><td className="text-xs">{r.entityType}</td><td className="text-xs">{Array.isArray(r.after) ? r.after.join(", ") : "—"}</td><td className="text-xs">{r.reason ?? ""}</td></tr>)}</tbody></table>
    </div>
  );
}
