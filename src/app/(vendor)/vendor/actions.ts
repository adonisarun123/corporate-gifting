"use server";

import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth/session";
import { proposeProduct } from "@/modules/catalog/service";
import { adjustStock, createOffer, reviseOfferCost } from "@/modules/supply/service";
import { submitSupplierResponse } from "@/modules/sourcing/service";
import { bool, errorMessage, formToObject, list, num, rupeesToMinor, str } from "@/lib/forms/parse";

function back(path: string, ok?: string, error?: string): never {
  const q = new URLSearchParams();
  if (ok) q.set("ok", ok);
  if (error) q.set("error", error);
  redirect(`${path}?${q.toString()}`);
}

export async function proposeProductAction(fd: FormData) {
  const f = formToObject(fd);
  const actor = await getActor();
  try {
    const variants = (Array.isArray(f.variants) ? f.variants : []) as Array<Record<string, string>>;
    const result = await proposeProduct(actor, {
      vendorId: f.vendorId,
      primaryCategorySlug: f.primaryCategorySlug,
      termSlugs: [...list(f.recipientSlugs), ...list(f.occasionSlugs)],
      content: {
        name: f.name,
        shortSummary: f.shortSummary,
        description: f.description,
        keyBenefits: list(f.keyBenefits),
        recipientSuitability: f.recipientSuitability,
        limitations: str(f.limitations),
        careInstructions: str(f.careInstructions),
        specifications: list(f.specifications).map((s) => { const [name, value] = s.split(":").map((x) => x.trim()); return { name: name ?? s, value: value ?? "" }; }).filter((s) => s.value),
        brandingMethods: list(f.brandingMethods),
        brandingNotes: str(f.brandingNotes),
        faqs: [],
      },
      variants: variants.filter((v) => v.label && v.skuSuffix).map((v) => ({ label: v.label, skuSuffix: v.skuSuffix, options: v.colour ? { colour: v.colour } : {} })),
      media: str(f.imageUrl) ? [{ url: f.imageUrl as string, altText: (str(f.imageAlt) ?? f.name) as string }] : [],
    });
    // Optional first offer in the same flow (spec §30 step 2).
    if (str(f.supplierSku) && result.variants[0]) {
      await createOffer(actor, {
        vendorId: f.vendorId,
        variantId: result.variants[0].id,
        supplierSku: f.supplierSku,
        moq: num(f.moq),
        quantityIncrement: num(f.quantityIncrement) ?? 1,
        supplyMode: f.supplyMode ?? "ready_stock",
        leadTimeDaysMin: num(f.leadTimeDaysMin),
        leadTimeDaysMax: num(f.leadTimeDaysMax),
        brandingCapabilities: list(f.brandingMethods),
        tiers: [{ minQuantity: num(f.moq), maxQuantity: null, unitCostMinor: rupeesToMinor(f.unitCostRupees) }],
        setupChargeMinor: rupeesToMinor(f.setupChargeRupees) ?? 0,
      });
    }
    back("/vendor/products", `Submitted ${result.product.publicCode} for review`);
  } catch (e) {
    if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e;
    back("/vendor/products/new", undefined, errorMessage(e));
  }
}

export async function createOfferAction(fd: FormData) {
  const f = formToObject(fd);
  try {
    await createOffer(await getActor(), {
      vendorId: f.vendorId,
      variantId: f.variantId,
      supplierSku: f.supplierSku,
      moq: num(f.moq),
      quantityIncrement: num(f.quantityIncrement) ?? 1,
      supplyMode: f.supplyMode ?? "ready_stock",
      leadTimeDaysMin: num(f.leadTimeDaysMin),
      leadTimeDaysMax: num(f.leadTimeDaysMax),
      brandingCapabilities: list(f.brandingCapabilities),
      tiers: [{ minQuantity: num(f.moq), maxQuantity: null, unitCostMinor: rupeesToMinor(f.unitCostRupees) }],
      setupChargeMinor: rupeesToMinor(f.setupChargeRupees) ?? 0,
    });
    back("/vendor/pricing", "Offer created");
  } catch (e) {
    if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e;
    back("/vendor/pricing", undefined, errorMessage(e));
  }
}

export async function adjustStockAction(fd: FormData) {
  const f = formToObject(fd);
  try {
    await adjustStock(await getActor(), {
      vendorId: f.vendorId,
      offerId: f.offerId,
      expectedVersion: num(f.expectedVersion),
      absoluteOnHand: num(f.absoluteOnHand),
      reason: str(f.reason),
    });
    back("/vendor/inventory", "Stock updated");
  } catch (e) {
    if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e;
    back("/vendor/inventory", undefined, errorMessage(e));
  }
}

export async function reviseCostAction(fd: FormData) {
  const f = formToObject(fd);
  try {
    const tiers = (Array.isArray(f.tiers) ? f.tiers : []) as Array<Record<string, string>>;
    await reviseOfferCost(await getActor(), {
      vendorId: f.vendorId,
      offerId: f.offerId,
      expectedVersion: num(f.expectedVersion),
      tiers: tiers.filter((t) => t.minQuantity && t.unitCostRupees).map((t) => ({ minQuantity: num(t.minQuantity), maxQuantity: num(t.maxQuantity) ?? null, unitCostMinor: rupeesToMinor(t.unitCostRupees) })),
      setupChargeMinor: rupeesToMinor(f.setupChargeRupees) ?? 0,
      notes: str(f.notes),
    });
    back("/vendor/pricing", "New cost revision saved; the public price is unchanged until the platform reviews it");
  } catch (e) {
    if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e;
    back("/vendor/pricing", undefined, errorMessage(e));
  }
}

export async function respondToRequestAction(fd: FormData) {
  const f = formToObject(fd);
  const path = `/vendor/requests/${f.requestId as string}`;
  try {
    const items = (Array.isArray(f.items) ? f.items : []) as Array<Record<string, string>>;
    await submitSupplierResponse(await getActor(), {
      vendorId: f.vendorId,
      requestId: f.requestId,
      decline: bool(f.decline),
      validUntil: str(f.validUntil) ? new Date(f.validUntil as string) : undefined,
      freightAssumptions: str(f.freightAssumptions),
      packagingAssemblyMinor: rupeesToMinor(f.packagingAssemblyRupees) ?? 0,
      notes: str(f.notes),
      items: bool(f.decline)
        ? []
        : items.filter((i) => i.unitCostRupees).map((i) => ({
            requestItemId: i.requestItemId,
            unitCostMinor: rupeesToMinor(i.unitCostRupees),
            setupChargeMinor: rupeesToMinor(i.setupChargeRupees) ?? 0,
            brandingUnitCostMinor: rupeesToMinor(i.brandingUnitCostRupees) ?? 0,
            readyQuantity: num(i.readyQuantity) ?? 0,
            leadTimeDaysMin: num(i.leadTimeDaysMin),
            leadTimeDaysMax: num(i.leadTimeDaysMax),
            dispatchDate: str(i.dispatchDate),
            substitutionNote: str(i.substitutionNote),
          })),
    });
    back(path, bool(f.decline) ? "Request declined" : "Response submitted");
  } catch (e) {
    if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e;
    back(path, undefined, errorMessage(e));
  }
}
