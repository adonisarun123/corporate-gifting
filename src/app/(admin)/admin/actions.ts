"use server";

import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth/session";
import { approveAndPublishRevision, rejectRevision } from "@/modules/catalog/service";
import { createVendor, inviteVendorManager, setVendorStatus } from "@/modules/vendors/service";
import { setPublicPrice } from "@/modules/supply/service";
import { addEnquiryNote, transitionEnquiry } from "@/modules/enquiries/service";
import { createSupplierRequest } from "@/modules/sourcing/service";
import { approveQuoteRevision, draftQuoteRevision, issueQuoteRevision } from "@/modules/quotes/service";
import { bool, errorMessage, formToObject, list, num, rupeesToMinor, str } from "@/lib/forms/parse";

function back(path: string, ok?: string, error?: string): never {
  const q = new URLSearchParams();
  if (ok) q.set("ok", ok);
  if (error) q.set("error", error);
  redirect(`${path}?${q.toString()}`);
}
const isRedirect = (e: unknown) => (e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT");

export async function approveRevisionAction(fd: FormData) {
  const f = formToObject(fd);
  try { await approveAndPublishRevision(await getActor(), { revisionId: f.revisionId as string, reason: str(f.reason) }); back("/admin/approvals", "Published"); }
  catch (e) { if (isRedirect(e)) throw e; back(`/admin/approvals/${f.revisionId as string}`, undefined, errorMessage(e)); }
}
export async function rejectRevisionAction(fd: FormData) {
  const f = formToObject(fd);
  try { await rejectRevision(await getActor(), { revisionId: f.revisionId as string, reason: (str(f.reason) ?? "") as string }); back("/admin/approvals", "Rejected with feedback"); }
  catch (e) { if (isRedirect(e)) throw e; back(`/admin/approvals/${f.revisionId as string}`, undefined, errorMessage(e)); }
}
export async function createVendorAction(fd: FormData) {
  const f = formToObject(fd);
  try { const v = await createVendor(await getActor(), { legalName: f.legalName, displayName: f.displayName, contactEmail: f.contactEmail, contactPhone: str(f.contactPhone), serviceCategories: list(f.serviceCategories), serviceableRegions: list(f.serviceableRegions) }); back("/admin/vendors", `Created ${v.vendorCode}`); }
  catch (e) { if (isRedirect(e)) throw e; back("/admin/vendors", undefined, errorMessage(e)); }
}
export async function inviteManagerAction(fd: FormData) {
  const f = formToObject(fd);
  try {
    const { token } = await inviteVendorManager(await getActor(), { vendorId: f.vendorId, email: f.email, role: f.role ?? "manager" });
    // Delivery is via the outbox e-mail; in dev the link is surfaced once here.
    back("/admin/vendors", process.env.NODE_ENV === "production" ? "Invitation sent" : `Invitation created — dev link: /vendor/accept?token=${token}`);
  } catch (e) { if (isRedirect(e)) throw e; back("/admin/vendors", undefined, errorMessage(e)); }
}
export async function setVendorStatusAction(fd: FormData) {
  const f = formToObject(fd);
  try { await setVendorStatus(await getActor(), { vendorId: f.vendorId as string, status: f.status as never, reason: (str(f.reason) ?? "") as string }); back("/admin/vendors", "Status updated"); }
  catch (e) { if (isRedirect(e)) throw e; back("/admin/vendors", undefined, errorMessage(e)); }
}
export async function setPublicPriceAction(fd: FormData) {
  const f = formToObject(fd);
  try {
    await setPublicPrice(await getActor(), { productId: f.productId, mode: f.mode, minQuantity: num(f.minQuantity) ?? 1, unitPriceMinor: f.mode === "request_quote" ? null : rupeesToMinor(f.unitPriceRupees), includesTax: bool(f.includesTax), includesBranding: bool(f.includesBranding), includesShipping: bool(f.includesShipping), reason: str(f.reason) });
    back("/admin/catalog", "Public price updated");
  } catch (e) { if (isRedirect(e)) throw e; back("/admin/catalog", undefined, errorMessage(e)); }
}
export async function transitionEnquiryAction(fd: FormData) {
  const f = formToObject(fd);
  const path = `/admin/enquiries/${f.enquiryId as string}`;
  try { await transitionEnquiry(await getActor(), { enquiryId: f.enquiryId as string, to: f.to as never, reason: str(f.reason), closedReason: str(f.closedReason) as never }); back(path, "Status updated"); }
  catch (e) { if (isRedirect(e)) throw e; back(path, undefined, errorMessage(e)); }
}
export async function addNoteAction(fd: FormData) {
  const f = formToObject(fd);
  const path = `/admin/enquiries/${f.enquiryId as string}`;
  try { await addEnquiryNote(await getActor(), { enquiryId: f.enquiryId as string, body: f.body as string, visibility: "internal" }); back(path, "Note added"); }
  catch (e) { if (isRedirect(e)) throw e; back(path, undefined, errorMessage(e)); }
}
export async function createSupplierRequestAction(fd: FormData) {
  const f = formToObject(fd);
  const path = `/admin/enquiries/${f.enquiryId as string}`;
  try {
    const items = (Array.isArray(f.items) ? f.items : []) as Array<Record<string, string>>;
    await createSupplierRequest(await getActor(), {
      enquiryId: f.enquiryId, vendorId: f.vendorId, dueAt: new Date(f.dueAt as string), message: str(f.message), releasedFields: bool(f.releaseCompany) ? ["companyName"] : [],
      items: items.filter((i) => i.include === "on").map((i) => ({ enquiryItemId: i.enquiryItemId, variantId: i.variantId, quantity: num(i.quantity), requirements: str(i.requirements) })),
    });
    back(path, "Supplier request sent");
  } catch (e) { if (isRedirect(e)) throw e; back(path, undefined, errorMessage(e)); }
}
export async function draftQuoteAction(fd: FormData) {
  const f = formToObject(fd);
  const path = `/admin/enquiries/${f.enquiryId as string}`;
  try {
    const lines = (Array.isArray(f.lines) ? f.lines : []) as Array<Record<string, string>>;
    const r = await draftQuoteRevision(await getActor(), {
      enquiryId: f.enquiryId,
      lines: lines.filter((l) => l.unitPriceRupees).map((l) => ({ enquiryItemId: l.enquiryItemId, unitPriceMinor: rupeesToMinor(l.unitPriceRupees), taxRateBp: Math.round(Number(l.taxRatePct ?? 0) * 100), supplierResponseItemId: str(l.supplierResponseItemId) ?? null, manualUnitCostMinor: rupeesToMinor(l.manualUnitCostRupees), allocatedFulfilmentMinor: rupeesToMinor(l.allocatedFulfilmentRupees) ?? 0, inclusions: str(l.inclusions) ?? "Excludes GST, custom branding and shipping unless stated." })),
      charges: str(f.chargeLabel) ? [{ label: f.chargeLabel as string, amountMinor: rupeesToMinor(f.chargeRupees) ?? 0, taxRateBp: Math.round(Number(f.chargeTaxPct ?? 0) * 100) }] : [],
      discountMinor: rupeesToMinor(f.discountRupees) ?? 0,
      terms: { validityDays: num(f.validityDays) ?? 14, paymentTerms: f.paymentTerms, deliveryTerms: f.deliveryTerms, leadTimeAssumptions: f.leadTimeAssumptions, inclusions: f.inclusions, termsVersion: f.termsVersion ?? "T-2026-09", quoteContact: { name: f.quoteContactName, email: f.quoteContactEmail } },
    });
    redirect(`/admin/quotes/${r.quote.id}?ok=${encodeURIComponent(r.needsMarginApproval ? "Draft saved — margin below floor, approval required before issue" : "Draft saved")}`);
  } catch (e) { if (isRedirect(e)) throw e; back(path, undefined, errorMessage(e)); }
}
export async function approveQuoteAction(fd: FormData) {
  const f = formToObject(fd);
  const path = `/admin/quotes/${f.quoteId as string}`;
  try { await approveQuoteRevision(await getActor(), { revisionId: f.revisionId as string, reason: str(f.reason) }); back(path, "Revision approved"); }
  catch (e) { if (isRedirect(e)) throw e; back(path, undefined, errorMessage(e)); }
}
export async function issueQuoteAction(fd: FormData) {
  const f = formToObject(fd);
  const path = `/admin/quotes/${f.quoteId as string}`;
  try {
    const r = await issueQuoteRevision(await getActor(), { revisionId: f.revisionId as string });
    back(path, process.env.NODE_ENV === "production" ? `Issued ${r.quoteNumber}` : `Issued ${r.quoteNumber} — dev customer link: /quotes/${r.quoteId}?t=${r.accessToken}`);
  } catch (e) { if (isRedirect(e)) throw e; back(path, undefined, errorMessage(e)); }
}
