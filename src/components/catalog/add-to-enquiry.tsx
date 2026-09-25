"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  productId: string;
  kind: "product" | "combo";
  minMoq: number | null;
  variants: Array<{ id: string; sku: string; label: string }>;
  brandingMethods: string[];
}

/** Primary CTA: adds a structured line to the server-side enquiry cart. Never buys or reserves stock. */
export function AddToEnquiry({ productId, kind, minMoq, variants, brandingMethods }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(minMoq ?? 100);
  const [branding, setBranding] = useState(brandingMethods[0] ?? "");
  const [instructions, setInstructions] = useState("");
  const [requiredBy, setRequiredBy] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    start(async () => {
      const res = await fetch("/api/v1/carts/current", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productId,
          variantId: variantId || null,
          quantity,
          configuration: {
            ...(branding ? { branding: { method: branding } } : {}),
            ...(instructions ? { instructions } : {}),
            ...(requiredBy ? { requiredBy } : {}),
          },
        }),
      });
      if (res.ok) {
        setMessage({ tone: "ok", text: `Added ${quantity.toLocaleString("en-IN")} ${kind === "combo" ? "kits" : "units"} to your enquiry cart.` });
        router.refresh();
      } else {
        const body = (await res.json().catch(() => ({}))) as { message?: string; fieldErrors?: Record<string, string[]> };
        const detail = body.fieldErrors ? Object.entries(body.fieldErrors).map(([k, v]) => `${k}: ${v.join(", ")}`).join("; ") : "";
        setMessage({ tone: "error", text: `${body.message ?? "Could not add to enquiry"}${detail ? ` (${detail})` : ""}` });
      }
    });
  };

  return (
    <form onSubmit={submit} className="card sticky top-4 space-y-4 p-5" aria-labelledby="enquiry-panel">
      <h2 id="enquiry-panel" className="text-base font-semibold">Add to enquiry</h2>
      {variants.length > 0 && (
        <div>
          <label className="label" htmlFor="variant">Variant</label>
          <select id="variant" className="input" value={variantId} onChange={(e) => setVariantId(e.target.value)}>
            {variants.map((v) => <option key={v.id} value={v.id}>{v.label} · {v.sku}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className="label" htmlFor="quantity">Quantity ({kind === "combo" ? "kits" : "units"})</label>
        <input id="quantity" type="number" min={1} className="input" value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))} required />
        {minMoq !== null && <p className="help">Minimum order quantity {minMoq.toLocaleString("en-IN")}; smaller quantities can still be enquired and will be reviewed.</p>}
      </div>
      <div>
        <label className="label" htmlFor="branding">Branding</label>
        <select id="branding" className="input" value={branding} onChange={(e) => setBranding(e.target.value)}>
          <option value="">No branding</option>
          {brandingMethods.map((m) => <option key={m} value={m}>{m.replace(/_/g, " ")}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="requiredBy">Required by (optional)</label>
        <input id="requiredBy" type="date" className="input" value={requiredBy} onChange={(e) => setRequiredBy(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="instructions">Special instructions (optional)</label>
        <textarea id="instructions" className="input" rows={2} maxLength={1000} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
      </div>
      <button type="submit" className="btn-primary w-full" disabled={pending}>{pending ? "Adding…" : "Add to enquiry"}</button>
      <p className="text-xs text-ink-muted">Adding to the enquiry cart does not buy or reserve stock.</p>
      <p role="status" aria-live="polite" className={message ? (message.tone === "ok" ? "text-sm font-medium text-success" : "field-error") : "sr-only"}>{message?.text ?? ""}</p>
    </form>
  );
}
