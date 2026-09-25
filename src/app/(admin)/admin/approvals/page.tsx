import Link from "next/link";
import { requireStaff } from "../context";
import { listPendingRevisions } from "@/modules/catalog/service";
import { Flash } from "@/components/ui/flash";

export default async function Approvals({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const actor = await requireStaff();
  const rows = await listPendingRevisions(actor);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Approval inbox</h1>
      <Flash {...sp} />
      {rows.length === 0 ? <p className="text-sm text-ink-muted">Nothing awaiting review.</p> : (
        <table className="table"><thead><tr><th>Code</th><th>Name</th><th>Rev</th><th>Current state</th><th>Submitted</th><th></th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.revisionId}><td>{r.publicCode}</td><td>{r.content.name}</td><td>{r.revisionNo}</td><td>{r.lifecycle}</td><td className="text-xs">{r.submittedAt?.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td><td><Link href={`/admin/approvals/${r.revisionId}`} className="text-brand underline">Review</Link></td></tr>)}</tbody></table>
      )}
    </div>
  );
}
