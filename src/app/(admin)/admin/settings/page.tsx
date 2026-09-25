import { requireStaff } from "../context";
import { getDb, withContextTransaction } from "@/db/client";
import { outboxEvents, systemSettings } from "@/db/schema";
import { platformContext } from "@/modules/identity/actor";
import { desc } from "drizzle-orm";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function AdminSettings() {
  const actor = await requireStaff();
  const { settings, outbox } = await withContextTransaction(platformContext(actor), async (tx) => ({
    settings: await tx.select().from(systemSettings),
    outbox: await tx.select().from(outboxEvents).orderBy(desc(outboxEvents.createdAt)).limit(50),
  }), getDb());
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <section><h2 className="font-semibold">System settings</h2>
        <table className="table mt-2 max-w-lg"><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>{settings.map((s) => <tr key={s.key}><td>{s.key}</td><td>{JSON.stringify(s.value)}</td></tr>)}{settings.length === 0 && <tr><td colSpan={2} className="text-ink-muted">Defaults in use: commercial.margin_floor_bp = 1500.</td></tr>}</tbody></table>
        <p className="help">Editing via UI is on the backlog; change with the seed script or SQL under the release process.</p></section>
      <section><h2 className="font-semibold">Outbox (last 50)</h2>
        <table className="table mt-2"><thead><tr><th>Created</th><th>Type</th><th>Status</th><th>Attempts</th><th>Last error</th></tr></thead>
          <tbody>{outbox.map((o) => <tr key={o.id}><td className="whitespace-nowrap text-xs">{o.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td><td className="text-xs">{o.type}</td><td><StatusBadge status={o.status} /></td><td>{o.attempts}</td><td className="text-xs text-danger">{o.lastError ?? ""}</td></tr>)}</tbody></table>
        <p className="help">Run `npm run jobs:dispatch` (or deploy the Inngest function) to process pending events.</p></section>
    </div>
  );
}
