import Link from "next/link";
import { requireVendorContext } from "../context";
import { listVendorProposals } from "@/modules/catalog/vendor";
import { StatusBadge } from "@/components/ui/status-badge";
import { Flash } from "@/components/ui/flash";

export default async function VendorProducts({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { actor, membership } = await requireVendorContext();
  const rows = await listVendorProposals(actor, membership.vendorId);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Products</h1><Link href="/vendor/products/new" className="btn-primary">Propose a product</Link></div>
      <Flash {...sp} />
      {rows.length === 0 ? <p className="text-sm text-ink-muted">No proposals yet.</p> : (
        <table className="table"><thead><tr><th>Code</th><th>Name</th><th>Revision</th><th>Review</th><th>Public state</th><th>Feedback</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.revisionId}><td>{r.publicCode}</td><td>{r.name.name}</td><td>{r.revisionNo}</td><td><StatusBadge status={r.reviewStatus} /></td><td><StatusBadge status={r.lifecycle} /></td><td className="text-ink-muted">{r.reviewReason ?? "—"}</td></tr>)}</tbody></table>
      )}
    </div>
  );
}
