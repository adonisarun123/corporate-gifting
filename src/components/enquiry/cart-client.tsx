"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { CartView } from "@/modules/carts/service";
import { formatINR } from "@/modules/pricing/money";
import { EnquiryForm } from "./enquiry-form";

type Line = CartView["items"][number];

export function CartClient({ initial }: { initial: CartView | null }) {
  const [cart, setCart] = useState<CartView | null>(initial);
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const res = await fetch("/api/v1/carts/current", { cache: "no-store" });
    if (res.ok) setCart((await res.json()) as CartView);
  }, []);

  // Server render passes the cart; a null initial (cookie set after render) triggers one client fetch.
  useEffect(() => {
    if (initial) return;
    let cancelled = false;
    fetch("/api/v1/carts/current", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => { if (!cancelled && c) setCart(c as CartView); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [initial]);

  const call = async (fn: () => Promise<Response>, ok: string) => {
    setBusy(true);
    setStatus("");
    try {
      const res = await fn();
      if (res.ok) {
        setCart((await res.json()) as CartView);
        setStatus(ok);
      } else {
        const b = (await res.json().catch(() => ({}))) as { message?: string; code?: string };
        setStatus(b.code === "conflict" ? "This line changed in another tab; it has been reloaded." : (b.message ?? "Something went wrong"));
        await reload();
      }
    } finally {
      setBusy(false);
    }
  };

  const update = (l: Line, quantity: number) =>
    call(() => fetch(`/api/v1/carts/current/items/${l.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ quantity, expectedVersion: l.rowVersion }) }), "Quantity updated");
  const remove = (l: Line) => call(() => fetch(`/api/v1/carts/current/items/${l.id}`, { method: "DELETE" }), "Line removed");
  const duplicate = (l: Line) =>
    call(() => fetch(`/api/v1/carts/current`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId: l.productId, variantId: l.variantId, quantity: l.quantity, configuration: { ...l.configuration, instructions: `${l.configuration.instructions ?? ""} (copy)`.trim() } }) }), "Line duplicated");

  if (!cart || cart.items.length === 0) {
    return (
      <div className="card p-8 text-center">
        <h2 className="text-lg font-semibold">Your enquiry cart is empty</h2>
        <p className="mt-2 text-sm text-ink-muted">Add gifts or combos, or send a brief without selecting products and we will propose options.</p>
        <div className="mt-4 flex justify-center gap-2"><Link href="/gifts" className="btn-primary">Browse gifts</Link><Link href="/contact" className="btn-secondary">Send a brief</Link></div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
      <section aria-labelledby="lines">
        <h2 id="lines" className="sr-only">Enquiry lines</h2>
        <p role="status" aria-live="polite" className="mb-2 text-sm text-ink-muted">{status}</p>
        <ul className="space-y-3">
          {cart.items.map((l) => (
            <li key={l.id} className="card grid gap-3 p-4 sm:grid-cols-[1fr_auto]">
              <div>
                <p className="font-semibold"><Link href={`/${l.kind === "combo" ? "combos" : "gifts"}/${l.slug}`} className="hover:underline">{l.name}</Link> <span className="text-xs text-ink-muted">{l.publicCode}</span></p>
                {l.variantLabel && <p className="text-sm text-ink-muted">{l.variantLabel}</p>}
                <ul className="mt-1 text-xs text-ink-muted">
                  {l.configuration.branding && <li>Branding: {l.configuration.branding.method.replace(/_/g, " ")}</li>}
                  {l.configuration.requiredBy && <li>Required by {l.configuration.requiredBy}</li>}
                  {l.configuration.instructions && <li>Note: {l.configuration.instructions}</li>}
                </ul>
                {!l.available && <p className="field-error">This product is no longer available. Remove it to continue.</p>}
                <p className="mt-2 text-sm">
                  {l.lineEstimateMinor !== null && l.estimate?.unitPriceMinor != null ? (
                    <>Estimate {formatINR(l.estimate.unitPriceMinor)} × {l.quantity.toLocaleString("en-IN")} = <strong>{formatINR(l.lineEstimateMinor)}</strong> <span className="text-ink-muted">({l.estimate.includesTax ? "incl." : "excl."} GST, {l.estimate.includesBranding ? "incl." : "excl."} branding)</span></>
                  ) : (
                    <span className="badge-neutral">Price to be confirmed in quotation</span>
                  )}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <label className="text-xs text-ink-muted" htmlFor={`qty-${l.id}`}>Quantity ({l.unit === "kit" ? "kits" : "units"})</label>
                <input id={`qty-${l.id}`} type="number" min={1} defaultValue={l.quantity} className="input w-32" disabled={busy}
                  onBlur={(e) => { const q = Number(e.target.value); if (q >= 1 && q !== l.quantity) void update(l, q); }} />
                <div className="flex gap-2 text-sm">
                  <button type="button" className="btn-secondary" disabled={busy} onClick={() => duplicate(l)}>Duplicate</button>
                  <button type="button" className="btn-danger" disabled={busy} onClick={() => remove(l)}>Remove</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="card mt-4 p-4 text-sm">
          <p><span className="text-ink-muted">Known subtotal (lines with a public estimate): </span><strong>{formatINR(cart.knownSubtotalMinor)}</strong></p>
          {cart.hasUnknownCharges && <p className="mt-1 text-ink-muted">Some lines have no public estimate yet, so this is not a total. Your quotation will state every amount.</p>}
        </div>
      </section>
      <EnquiryForm cartId={cart.id} cartVersion={cart.rowVersion} hasUnavailable={cart.items.some((i) => !i.available)} />
    </div>
  );
}
