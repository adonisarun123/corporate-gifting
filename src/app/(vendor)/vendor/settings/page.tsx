import { requireVendorContext } from "../context";

export default async function VendorSettings() {
  const { membership, actor } = await requireVendorContext();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <dl className="card grid gap-2 p-4 text-sm sm:grid-cols-2">
        <div><dt className="text-ink-muted">Organisation</dt><dd>{membership.vendorName}</dd></div>
        <div><dt className="text-ink-muted">Vendor code (private)</dt><dd>{membership.vendorCode}</dd></div>
        <div><dt className="text-ink-muted">Your role</dt><dd>{membership.role}</dd></div>
        <div><dt className="text-ink-muted">Signed in as</dt><dd>{actor.email}</dd></div>
      </dl>
      <p className="text-sm text-ink-muted">Inviting colleagues, dispatch locations and document uploads are handled by the platform team for now (backlog: vendor-owner self-service).</p>
    </div>
  );
}
