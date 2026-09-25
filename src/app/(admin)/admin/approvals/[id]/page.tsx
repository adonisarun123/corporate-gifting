import { notFound } from "next/navigation";
import { requireStaff } from "../../context";
import { getRevisionDiff } from "@/modules/catalog/review";
import { approveRevisionAction, rejectRevisionAction } from "../../actions";
import { Flash } from "@/components/ui/flash";

export default async function ReviewRevision({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const actor = await requireStaff();
  const d = await getRevisionDiff(actor, id);
  if (!d) notFound();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Review {d.product.publicCode} · revision {d.proposed.revisionNo}</h1>
      <Flash error={sp.error} />
      <p className="text-sm text-ink-muted">Proposed by {d.authorVendorCode ?? "platform"} · {d.proposed.submittedAt?.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}. {d.current ? "The currently published content stays live until you approve." : "This is the first revision; the product is not public yet."}</p>
      <table className="table"><thead><tr><th className="w-40">Field</th><th>{d.current ? "Current (published)" : "—"}</th><th>Proposed</th></tr></thead>
        <tbody>{d.fields.map((f) => <tr key={f.name} className={f.changed ? "bg-warning-soft/40" : ""}><td className="font-medium">{f.name}</td><td className="whitespace-pre-wrap text-xs text-ink-muted">{f.before ?? "—"}</td><td className="whitespace-pre-wrap text-xs">{f.after}</td></tr>)}</tbody></table>
      {d.media.length > 0 && <div><h2 className="font-semibold">Media</h2><ul className="mt-2 grid grid-cols-3 gap-2">{d.media.map((m) => (
        // eslint-disable-next-line @next/next/no-img-element
        <li key={m.id} className="card overflow-hidden"><img src={m.url} alt={m.altText} width={300} height={225} className="aspect-[4/3] w-full object-cover" /><p className="p-2 text-xs">{m.altText}</p></li>))}</ul></div>}
      {d.checks.length > 0 && <div className="card p-4"><h2 className="font-semibold">Automated checks</h2><ul className="mt-2 list-disc pl-5 text-sm">{d.checks.map((c) => <li key={c} className="text-warning">{c}</li>)}</ul></div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <form action={approveRevisionAction} className="card space-y-2 p-4"><input type="hidden" name="revisionId" value={id} /><label className="label" htmlFor="ar">Approval note (optional)</label><input id="ar" name="reason" className="input" /><button className="btn-primary" type="submit">Approve and publish</button></form>
        <form action={rejectRevisionAction} className="card space-y-2 p-4"><input type="hidden" name="revisionId" value={id} /><label className="label" htmlFor="rr">Rejection reason (shown to the vendor)</label><input id="rr" name="reason" className="input" required /><button className="btn-danger" type="submit">Reject</button></form>
      </div>
    </div>
  );
}
