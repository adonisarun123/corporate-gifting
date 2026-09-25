import { requireStaff } from "../context";
import { listAuditEvents } from "@/modules/audit/read";

export default async function AdminAudit({ searchParams }: { searchParams: Promise<{ entityType?: string; entityId?: string; vendorId?: string }> }) {
  const sp = await searchParams;
  const actor = await requireStaff();
  const rows = await listAuditEvents(actor, { entityType: sp.entityType, entityId: sp.entityId, vendorId: sp.vendorId, limit: 200 });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Audit</h1>
      <form className="flex flex-wrap gap-2" action="/admin/audit"><input name="entityType" placeholder="entity type" defaultValue={sp.entityType ?? ""} className="input w-40" /><input name="entityId" placeholder="entity id" defaultValue={sp.entityId ?? ""} className="input w-72" /><input name="vendorId" placeholder="vendor id" defaultValue={sp.vendorId ?? ""} className="input w-72" /><button className="btn-secondary" type="submit">Filter</button></form>
      <div className="overflow-x-auto"><table className="table"><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Before</th><th>After</th><th>Reason</th><th>Request</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id}><td className="whitespace-nowrap text-xs">{r.occurredAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td><td className="text-xs">{r.actorKind}{r.actorId ? ` ${r.actorId.slice(0, 8)}` : ""}</td><td className="text-xs">{r.action}</td><td className="text-xs">{r.entityType} {r.entityId.slice(0, 8)}</td><td className="max-w-48 whitespace-pre-wrap text-xs">{r.before ? JSON.stringify(r.before) : ""}</td><td className="max-w-48 whitespace-pre-wrap text-xs">{r.after ? JSON.stringify(r.after) : ""}</td><td className="text-xs">{r.reason ?? ""}</td><td className="text-xs">{r.requestId?.slice(0, 8) ?? ""}</td></tr>)}</tbody></table></div>
      <p className="text-sm text-ink-muted">Append-only at the database level (no UPDATE/DELETE grants for the runtime role, plus a trigger). A privileged database operator could still alter rows; export to separately permissioned storage if stronger tamper-evidence is required.</p>
    </div>
  );
}
