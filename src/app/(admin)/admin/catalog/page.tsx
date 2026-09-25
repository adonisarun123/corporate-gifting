import Link from "next/link";
import { requireStaff } from "../context";
import { listAllProducts } from "@/modules/catalog/service";
import { setPublicPriceAction } from "../actions";
import { Flash } from "@/components/ui/flash";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function AdminCatalog({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const actor = await requireStaff();
  const rows = await listAllProducts(actor);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Catalogue</h1>
      <Flash {...sp} />
      <table className="table"><thead><tr><th>Code</th><th>Name</th><th>Kind</th><th>State</th><th>Public price</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id}>
            <td>{r.publicCode}</td>
            <td>{r.name ?? "—"} {r.lifecycle === "published" && <Link href={`/${r.kind === "combo" ? "combos" : "gifts"}/${r.slug}`} className="text-xs text-brand underline">view</Link>}</td>
            <td>{r.kind}</td><td><StatusBadge status={r.lifecycle} /></td>
            <td>
              <form action={setPublicPriceAction} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="productId" value={r.id} />
                <div><label className="sr-only" htmlFor={`m-${r.id}`}>Mode</label><select id={`m-${r.id}`} name="mode" className="input w-36"><option value="from">From price</option><option value="indicative">Indicative</option><option value="request_quote">Request quote</option></select></div>
                <div><label className="sr-only" htmlFor={`q-${r.id}`}>Qualifying qty</label><input id={`q-${r.id}`} name="minQuantity" type="number" min={1} defaultValue={100} className="input w-24" title="Qualifying quantity" /></div>
                <div><label className="sr-only" htmlFor={`p-${r.id}`}>Unit price ₹</label><input id={`p-${r.id}`} name="unitPriceRupees" type="number" min={0} step="0.01" className="input w-28" placeholder="₹ / unit" /></div>
                <label className="text-xs"><input type="checkbox" name="includesTax" /> incl. GST</label>
                <label className="text-xs"><input type="checkbox" name="includesBranding" /> incl. branding</label>
                <button className="btn-secondary" type="submit">Set</button>
              </form>
            </td>
          </tr>
        ))}</tbody></table>
      <p className="text-sm text-ink-muted">Public prices are platform-owned and independent of vendor cost revisions. Every change is audited.</p>
    </div>
  );
}
