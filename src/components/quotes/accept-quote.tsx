"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AcceptQuote({ quoteId, revisionId, documentHash, token }: { quoteId: string; revisionId: string; documentHash: string; token: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [agree, setAgree] = useState(false);
  const accept = async () => {
    setBusy(true); setMsg("");
    const url = `/api/v1/quotes/${quoteId}/accept${token ? `?t=${encodeURIComponent(token)}` : ""}`;
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ revisionId, documentHash }) });
    const body = (await res.json()) as { message?: string; details?: { currentRevisionId?: string } };
    if (res.ok) { setMsg("Accepted. Our team will confirm the next steps."); router.refresh(); }
    else { setMsg(body.details?.currentRevisionId ? "This quotation was revised. The page will reload with the current revision." : (body.message ?? "Could not accept")); if (body.details?.currentRevisionId) router.refresh(); }
    setBusy(false);
  };
  return (
    <div className="card space-y-3 p-5">
      <h2 className="font-semibold">Accept this quotation</h2>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><span>I have reviewed this revision and accept its prices and terms. Acceptance is not yet an order confirmation.</span></label>
      <button className="btn-primary" disabled={!agree || busy} onClick={accept}>{busy ? "Accepting…" : "Accept quotation"}</button>
      <p role="status" aria-live="polite" className={msg ? "text-sm" : "sr-only"}>{msg}</p>
    </div>
  );
}
