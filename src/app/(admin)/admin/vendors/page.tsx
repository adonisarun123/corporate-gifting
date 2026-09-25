import { requireStaff } from "../context";
import { listVendors } from "@/modules/vendors/service";
import { createVendorAction, inviteManagerAction, setVendorStatusAction } from "../actions";
import { Flash } from "@/components/ui/flash";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function AdminVendors({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const actor = await requireStaff();
  const rows = await listVendors(actor);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Vendors</h1>
      <Flash {...sp} />
      <table className="table"><thead><tr><th>Code</th><th>Name</th><th>Status</th><th>Contact</th><th>Actions</th></tr></thead>
        <tbody>{rows.map((v) => (
          <tr key={v.id}>
            <td>{v.vendorCode}</td><td>{v.displayName}<span className="block text-xs text-ink-muted">{v.legalName}</span></td><td><StatusBadge status={v.status} /></td><td className="text-xs">{v.contactEmail}</td>
            <td className="space-y-2">
              <form action={inviteManagerAction} className="flex flex-wrap gap-2"><input type="hidden" name="vendorId" value={v.id} /><label className="sr-only" htmlFor={`inv-${v.id}`}>Manager e-mail</label><input id={`inv-${v.id}`} name="email" type="email" className="input w-56" placeholder="manager@vendor.example" required /><button className="btn-secondary" type="submit">Invite manager</button></form>
              <form action={setVendorStatusAction} className="flex flex-wrap gap-2"><input type="hidden" name="vendorId" value={v.id} /><label className="sr-only" htmlFor={`st-${v.id}`}>Status</label><select id={`st-${v.id}`} name="status" defaultValue={v.status === "active" ? "suspended" : "active"} className="input w-32"><option value="active">active</option><option value="paused">paused</option><option value="suspended">suspended</option><option value="archived">archived</option></select><input name="reason" className="input w-48" placeholder="Reason" required /><button className="btn-secondary" type="submit">Set status</button></form>
            </td>
          </tr>
        ))}</tbody></table>
      <form action={createVendorAction} className="card grid gap-3 p-4 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Create vendor</h2>
        <div><label className="label" htmlFor="legalName">Legal name</label><input id="legalName" name="legalName" className="input" required /></div>
        <div><label className="label" htmlFor="displayName">Display name</label><input id="displayName" name="displayName" className="input" required /></div>
        <div><label className="label" htmlFor="contactEmail">Contact e-mail</label><input id="contactEmail" name="contactEmail" type="email" className="input" required /></div>
        <div><label className="label" htmlFor="contactPhone">Phone</label><input id="contactPhone" name="contactPhone" className="input" /></div>
        <div><label className="label" htmlFor="serviceCategories">Service categories (comma-separated)</label><input id="serviceCategories" name="serviceCategories" className="input" /></div>
        <div><label className="label" htmlFor="serviceableRegions">Serviceable regions</label><input id="serviceableRegions" name="serviceableRegions" className="input" /></div>
        <div className="sm:col-span-2"><button className="btn-primary" type="submit">Create vendor (allocates VEN code)</button></div>
      </form>
    </div>
  );
}
