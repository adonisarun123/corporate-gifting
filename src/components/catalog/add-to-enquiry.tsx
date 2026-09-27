"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconCart, IconCheck } from "@/components/ui/icons";

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
  const [more, setMore] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const unit = kind === "combo" ? "kits" : "units";
  const step = minMoq && minMoq >= 100 ? 50 : 10;

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
        setMessage({ tone: "ok", text: `Added ${quantity.toLocaleString("en-IN")} ${unit} to your enquiry cart.` });
        router.refresh();
      } else {
        const body = (await res.json().catch(() => ({}))) as { message?: string; fieldErrors?: Record<string, string[]> };
        const detail = body.fieldErrors ? Object.entries(body.fieldErrors).map(([k, v]) => `${k}: ${v.join(", ")}`).join("; ") : "";
        setMessage({ tone: "error", text: `${body.message ?? "Could not add to enquiry"}${detail ? ` (${detail})` : ""}` });
      }
    });
  };

  return (
    <form onSubmit={submit} className="card-elevated space-y-4 p-5" aria-labelledby="enquiry-panel">
      <div className="flex items-center justify-between"><h2 id="enquiry-panel" className="text-base font-bold">Add to enquiry</h2><span className="text-xs text-ink-muted">No payment · no reservation</span></div>

      {variants.length > 0 && (
        <fieldset>
          <legend className="label">Variant</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <label key={v.id} className={`chip cursor-pointer ${variantId === v.id ? "chip-active" : ""}`}>
                <input type="radio" name="variant" value={v.id} checked={variantId === v.id} onChange={() => setVariantId(v.id)} className="sr-only" />
                {v.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="quantity">Quantity ({unit})</label>
          <div className="flex">
            <button type="button" className="btn-secondary h-11 w-11 rounded-r-none px-0" aria-label={`Decrease by ${step}`} onClick={() => setQuantity((q) => Math.max(1, q - step))}>−</button>
            <input id="quantity" type="number" min={1} className="input h-11 rounded-none border-x-0 text-center font-semibold" value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))} required />
            <button type="button" className="btn-secondary h-11 w-11 rounded-l-none px-0" aria-label={`Increase by ${step}`} onClick={() => setQuantity((q) => q + step)}>+</button>
          </div>
          {minMoq !== null && <p className={`help ${quantity < minMoq ? "text-warning" : ""}`}>{quantity < minMoq ? `Below the ${minMoq.toLocaleString("en-IN")} MOQ — still enquirable; we will review.` : `MOQ ${minMoq.toLocaleString("en-IN")} ${unit}`}</p>}
        </div>
        <div>
          <label className="label" htmlFor="branding">Branding</label>
          <select id="branding" className="input h-11 capitalize" value={branding} onChange={(e) => setBranding(e.target.value)}>
            <option value="">No branding</option>
            {brandingMethods.map((m) => <option key={m} value={m}>{m.replace(/_/g, " ")}</option>)}
          </select>
        </div>
      </div>

      <button type="button" className="text-sm font-semibold text-brand hover:underline" aria-expanded={more} onClick={() => setMore((v) => !v)}>{more ? "Hide" : "Add"} date and instructions</button>
      {more && (
        <div className="grid gap-3">
          <div>
            <label className="label" htmlFor="requiredBy">Required by</label>
            <input id="requiredBy" type="date" className="input" value={requiredBy} onChange={(e) => setRequiredBy(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="instructions">Special instructions</label>
            <textarea id="instructions" className="input" rows={2} maxLength={1000} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Colour preference, artwork notes, multiple delivery points…" />
          </div>
        </div>
      )}

      <button type="submit" className="btn-primary btn-lg w-full" disabled={pending}><IconCart width={18} height={18} />{pending ? "Adding…" : "Add to enquiry cart"}</button>
      <p role="status" aria-live="polite" className={message ? (message.tone === "ok" ? "flex items-center gap-2 text-sm font-medium text-success" : "field-error") : "sr-only"}>
        {message?.tone === "ok" && <IconCheck width={16} height={16} />}{message?.text ?? ""}{message?.tone === "ok" && <> <Link href="/enquiry-cart" className="underline">View cart</Link></>}
      </p>
      <p className="text-xs text-ink-muted">Adding to the enquiry cart does not buy or reserve stock. Prices shown are indicative; your quotation confirms final figures.</p>
    </form>
  );
}
