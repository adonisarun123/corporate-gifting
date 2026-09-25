"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const NOTICE_VERSION = "2026-09-01";

type Errors = Record<string, string[]>;

/**
 * Two-step, resumable flow: verify e-mail (code), then submit with an Idempotency-Key that is
 * generated once per cart version, so retries and double clicks return the same enquiry.
 */
export function EnquiryForm({ cartId, cartVersion, hasUnavailable }: { cartId: string; cartVersion: number; hasUnavailable: boolean }) {
  const router = useRouter();
  // One key per cart version for the life of this form instance: retries and double-clicks reuse it.
  const [idempotencyKey] = useState(() => `${cartId}:${cartVersion}:${globalThis.crypto?.randomUUID?.() ?? String(Math.random()).slice(2)}`);
  const [f, setF] = useState({ contactName: "", email: "", phone: "", designation: "", companyName: "", occasion: "", recipientCount: 100, budgetRupees: "", includesTax: true, includesBranding: true, city: "", postalCode: "", requestedDeliveryDate: "", dateIsFlexible: false, brandingNeeds: "", notes: "", processingAcknowledged: false, marketingOptIn: false });
  const [verification, setVerification] = useState<{ id: string; verified: boolean } | null>(null);
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const err = (k: string) => errors[k]?.join(", ");

  const sendCode = async () => {
    setBusy(true); setMsg(""); setErrors({});
    const res = await fetch("/api/v1/verifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: f.email }) });
    const body = (await res.json()) as { verificationId?: string; fieldErrors?: Errors; message?: string };
    if (res.ok && body.verificationId) { setVerification({ id: body.verificationId, verified: false }); setMsg(`A 6-digit code was sent to ${f.email}.`); }
    else { setErrors(body.fieldErrors ?? {}); setMsg(body.message ?? "Could not send the code"); }
    setBusy(false);
  };
  const confirmCode = async () => {
    if (!verification) return;
    setBusy(true); setMsg("");
    const res = await fetch("/api/v1/verifications/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ verificationId: verification.id, code }) });
    const body = (await res.json()) as { verified?: boolean; message?: string };
    if (res.ok && body.verified) { setVerification({ ...verification, verified: true }); setMsg("E-mail verified."); }
    else setMsg(body.message ?? "Incorrect code");
    setBusy(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verification?.verified) { setMsg("Verify your e-mail first."); return; }
    setBusy(true); setMsg(""); setErrors({});
    const payload = {
      cartId, expectedCartVersion: cartVersion, contactVerificationId: verification.id,
      contactName: f.contactName, email: f.email, phone: f.phone || undefined, designation: f.designation || undefined, companyName: f.companyName,
      occasion: f.occasion || undefined, recipientCount: Number(f.recipientCount),
      budget: f.budgetRupees ? { currency: "INR", perRecipientMinor: Math.round(Number(f.budgetRupees) * 100), includesTax: f.includesTax, includesBranding: f.includesBranding, includesShipping: false } : null,
      destination: { country: "IN", city: f.city || undefined, postalCode: f.postalCode },
      requestedDeliveryDate: f.requestedDeliveryDate || undefined, dateIsFlexible: f.dateIsFlexible,
      brandingNeeds: f.brandingNeeds || undefined, notes: f.notes || undefined,
      processingNoticeVersion: NOTICE_VERSION, processingAcknowledged: f.processingAcknowledged, marketingOptIn: f.marketingOptIn,
    };
    const res = await fetch("/api/v1/enquiries", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": idempotencyKey }, body: JSON.stringify(payload) });
    const body = (await res.json()) as { reference?: string; enquiryId?: string; fieldErrors?: Errors; message?: string; code?: string };
    if (res.ok && body.reference) {
      router.push(`/enquiry/thank-you?ref=${encodeURIComponent(body.reference)}`);
      return;
    }
    setErrors(body.fieldErrors ?? {});
    setMsg(body.code === "conflict" ? "Your cart changed while you were filling the form. Reload the page and review it, then submit again." : (body.message ?? "Submission failed; nothing was lost, please retry."));
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="card space-y-4 p-5" aria-labelledby="enquiry-form-title" noValidate>
      <h2 id="enquiry-form-title" className="text-lg font-semibold">Send your requirements</h2>
      {hasUnavailable && <p className="field-error">Remove unavailable lines before submitting.</p>}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-ink-muted">Contact</legend>
        <div><label className="label" htmlFor="contactName">Your name</label><input id="contactName" className="input" required value={f.contactName} onChange={(e) => set("contactName", e.target.value)} aria-invalid={!!err("contactName")} />{err("contactName") && <p className="field-error">{err("contactName")}</p>}</div>
        <div><label className="label" htmlFor="companyName">Company or organisation</label><input id="companyName" className="input" required value={f.companyName} onChange={(e) => set("companyName", e.target.value)} />{err("companyName") && <p className="field-error">{err("companyName")}</p>}<p className="help">Any business e-mail is fine, including small businesses.</p></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label" htmlFor="designation">Designation (optional)</label><input id="designation" className="input" value={f.designation} onChange={(e) => set("designation", e.target.value)} /></div>
          <div><label className="label" htmlFor="phone">Phone (optional)</label><input id="phone" className="input" type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></div>
        </div>
        <div>
          <label className="label" htmlFor="email">Work e-mail (verified for this enquiry)</label>
          <div className="flex gap-2">
            <input id="email" className="input" type="email" required value={f.email} onChange={(e) => { set("email", e.target.value); setVerification(null); }} disabled={!!verification?.verified} />
            {!verification?.verified && <button type="button" className="btn-secondary shrink-0" onClick={sendCode} disabled={busy || !f.email}>{verification ? "Resend code" : "Send code"}</button>}
          </div>
          {err("email") && <p className="field-error">{err("email")}</p>}
          {verification && !verification.verified && (
            <div className="mt-2 flex gap-2">
              <label className="sr-only" htmlFor="code">Verification code</label>
              <input id="code" className="input" inputMode="numeric" pattern="\d{6}" maxLength={6} placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} />
              <button type="button" className="btn-primary shrink-0" onClick={confirmCode} disabled={busy || code.length !== 6}>Verify</button>
            </div>
          )}
          {verification?.verified && <p className="mt-1 text-sm font-medium text-success">Verified ✓</p>}
        </div>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-ink-muted">Requirement</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label" htmlFor="recipientCount">Number of recipients</label><input id="recipientCount" className="input" type="number" min={1} required value={f.recipientCount} onChange={(e) => set("recipientCount", Number(e.target.value))} />{err("recipientCount") && <p className="field-error">{err("recipientCount")}</p>}</div>
          <div><label className="label" htmlFor="occasion">Occasion (optional)</label><input id="occasion" className="input" value={f.occasion} onChange={(e) => set("occasion", e.target.value)} placeholder="e.g. employee onboarding" /></div>
          <div><label className="label" htmlFor="city">Delivery city</label><input id="city" className="input" value={f.city} onChange={(e) => set("city", e.target.value)} /></div>
          <div><label className="label" htmlFor="postalCode">Delivery PIN code</label><input id="postalCode" className="input" inputMode="numeric" pattern="\d{6}" required value={f.postalCode} onChange={(e) => set("postalCode", e.target.value)} />{err("destination.postalCode") && <p className="field-error">Enter a 6-digit PIN code</p>}</div>
          <div><label className="label" htmlFor="budgetRupees">Budget per recipient (₹, optional)</label><input id="budgetRupees" className="input" type="number" min={0} value={f.budgetRupees} onChange={(e) => set("budgetRupees", e.target.value)} /></div>
          <div className="flex flex-col justify-end gap-1 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.includesTax} onChange={(e) => set("includesTax", e.target.checked)} /> Budget includes GST</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.includesBranding} onChange={(e) => set("includesBranding", e.target.checked)} /> Budget includes branding</label>
          </div>
          <div><label className="label" htmlFor="requestedDeliveryDate">Required by (optional)</label><input id="requestedDeliveryDate" className="input" type="date" value={f.requestedDeliveryDate} onChange={(e) => set("requestedDeliveryDate", e.target.value)} /></div>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={f.dateIsFlexible} onChange={(e) => set("dateIsFlexible", e.target.checked)} /> Date is flexible</label>
        </div>
        <div><label className="label" htmlFor="brandingNeeds">Branding needs (optional)</label><input id="brandingNeeds" className="input" value={f.brandingNeeds} onChange={(e) => set("brandingNeeds", e.target.value)} /></div>
        <div><label className="label" htmlFor="notes">Notes (optional)</label><textarea id="notes" className="input" rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></div>
      </fieldset>
      <fieldset className="space-y-2 text-sm">
        <legend className="sr-only">Consent</legend>
        <label className="flex items-start gap-2"><input type="checkbox" required checked={f.processingAcknowledged} onChange={(e) => set("processingAcknowledged", e.target.checked)} /><span>I understand this enquiry will be processed as described in the <a href="/privacy" className="text-brand underline">privacy notice</a> (v{NOTICE_VERSION}).</span></label>
        <label className="flex items-start gap-2"><input type="checkbox" checked={f.marketingOptIn} onChange={(e) => set("marketingOptIn", e.target.checked)} /><span>Send me occasional gifting ideas (optional).</span></label>
      </fieldset>
      <button type="submit" className="btn-primary w-full" disabled={busy || hasUnavailable || !verification?.verified}>{busy ? "Submitting…" : "Submit enquiry"}</button>
      <p role="status" aria-live="polite" className={msg ? "text-sm" : "sr-only"}>{msg}</p>
    </form>
  );
}
