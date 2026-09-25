import { requireStaff } from "../context";
import { getFunnel } from "@/modules/analytics/service";
import { formatINR } from "@/modules/pricing/money";

export default async function AdminReports() {
  const actor = await requireStaff();
  const f = await getFunnel(actor);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Reports</h1>
      <table className="table max-w-md"><thead><tr><th>Enquiry status</th><th>Count</th></tr></thead><tbody>{f.byStatus.map((s) => <tr key={s.status}><td>{s.status.replace(/_/g, " ")}</td><td>{s.n}</td></tr>)}</tbody></table>
      <dl className="card grid gap-2 p-4 text-sm sm:grid-cols-2">
        <div><dt className="text-ink-muted">Quoted value (open issued revisions)</dt><dd className="text-xl font-semibold">{formatINR(f.quotedValueMinor)}</dd></div>
        <div><dt className="text-ink-muted">Accepted value</dt><dd className="text-xl font-semibold">{formatINR(f.acceptedValueMinor)}</dd></div>
      </dl>
      <p className="text-sm text-ink-muted">Recognised revenue is not reported until an order-confirmation workflow exists. Product analytics (PostHog) is not wired yet; funnel rates require it.</p>
    </div>
  );
}
