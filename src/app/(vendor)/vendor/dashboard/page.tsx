import Link from "next/link";
import { requireVendorContext } from "../context";
import { listVendorOffers } from "@/modules/supply/service";
import { listVendorRequests } from "@/modules/sourcing/service";
import { listVendorProposals } from "@/modules/catalog/vendor";
import { stockState } from "@/modules/pricing/rules";

export default async function VendorDashboard({ searchParams }: { searchParams: Promise<{ vendor?: string }> }) {
  const { vendor } = await searchParams;
  const { actor, membership } = await requireVendorContext(vendor);
  const [offers, requests, proposals] = await Promise.all([listVendorOffers(actor, membership.vendorId), listVendorRequests(actor, membership.vendorId), listVendorProposals(actor, membership.vendorId)]);
  const stale = offers.filter((o) => stockState(o.observedAt ?? null, o.offer.supplyMode) === "stale").length;
  const low = offers.filter((o) => (o.onHand ?? 0) < o.offer.moq && o.offer.supplyMode !== "made_to_order").length;
  const awaiting = requests.filter((r) => r.status === "sent").length;
  const rejected = proposals.filter((p) => p.reviewStatus === "rejected").length;
  const cards = [
    { label: "Supplier requests awaiting response", value: awaiting, href: "/vendor/requests" },
    { label: "Stale stock records (older than 7 days)", value: stale, href: "/vendor/inventory" },
    { label: "Offers below MOQ on hand", value: low, href: "/vendor/inventory" },
    { label: "Rejected submissions", value: rejected, href: "/vendor/products" },
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map((c) => <li key={c.label}><Link href={c.href} className="card block p-4 hover:bg-brand-soft"><p className="text-3xl font-bold">{c.value}</p><p className="text-sm text-ink-muted">{c.label}</p></Link></li>)}</ul>
      <p className="text-sm text-ink-muted">Counts are computed from your records; nothing here is a placeholder.</p>
    </div>
  );
}
