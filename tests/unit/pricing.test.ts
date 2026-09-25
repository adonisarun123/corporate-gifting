import { describe, expect, it } from "vitest";
import { applyBp, formatINR, grossMarginBp, priceForTargetMargin } from "@/modules/pricing/money";
import { assertNoTierOverlap, availableToPromise, maxKitsFromStock, selectTier, stockState, validateQuantity } from "@/modules/pricing/rules";
import { calculateQuote } from "@/modules/pricing/quote-calc";
import { canTransition } from "@/modules/enquiries/service";
import { permissionsForRoles, ROLE_PERMISSIONS, VENDOR_ROLE_PERMISSIONS } from "@/lib/permissions/matrix";
import { pickPrice } from "@/modules/catalog/public";

describe("money", () => {
  it("margin is not markup: cost ₹800 at 20% margin → ₹1,000, not ₹960 (spec §18)", () => {
    expect(priceForTargetMargin(80_000, 2000)).toBe(100_000);
    expect(grossMarginBp(100_000, 80_000)).toBe(2000);
    expect(grossMarginBp(96_000, 80_000)).not.toBe(2000);
  });
  it("applies basis points with a single half-up rounding", () => {
    expect(applyBp(100_001, 1800)).toBe(18_000); // 18000.18 → 18000
    expect(applyBp(100_003, 1800)).toBe(18_001); // 18000.54 → 18001
    expect(applyBp(5, 1800)).toBe(1); // 0.9 → 1
  });
  it("rejects non-integer minor units", () => {
    expect(() => applyBp(10.5, 1800)).toThrow(RangeError);
  });
  it("formats INR", () => {
    expect(formatINR(65000)).toBe("₹650");
    expect(formatINR(24_780_050)).toBe("₹2,47,800.50");
  });
});

describe("tiers and quantities", () => {
  const tiers = [
    { minQuantity: 100, maxQuantity: 499, unitCostMinor: 52000 },
    { minQuantity: 500, maxQuantity: null, unitCostMinor: 48000 },
  ];
  it("lower bound inclusive, upper bound inclusive, open-ended last tier", () => {
    expect(selectTier(tiers, 99)).toBeNull();
    expect(selectTier(tiers, 100)?.unitCostMinor).toBe(52000);
    expect(selectTier(tiers, 499)?.unitCostMinor).toBe(52000);
    expect(selectTier(tiers, 500)?.unitCostMinor).toBe(48000);
    expect(selectTier(tiers, 1_000_000)?.unitCostMinor).toBe(48000);
  });
  it("detects overlapping tiers", () => {
    expect(() => assertNoTierOverlap([...tiers, { minQuantity: 450, maxQuantity: 600, unitCostMinor: 1 }])).toThrow(/overlap/);
    expect(() => assertNoTierOverlap(tiers)).not.toThrow();
  });
  it("validates MOQ and increments before tier lookup", () => {
    expect(() => validateQuantity(99, 100, 50)).toThrow(/Minimum order/);
    expect(() => validateQuantity(120, 100, 50)).toThrow(/steps of 50/);
    expect(() => validateQuantity(150, 100, 50)).not.toThrow();
    expect(() => validateQuantity(0, 1, 1)).toThrow();
  });
});

describe("inventory", () => {
  it("available to promise never goes negative", () => {
    expect(availableToPromise(100, 30, 20)).toBe(50);
    expect(availableToPromise(10, 30, 20)).toBe(0);
  });
  it("AC-12: repeated component SKU is combined before dividing", () => {
    // Kit uses the same bottle twice (2 per kit) via two component rows, plus a notebook.
    const kits = maxKitsFromStock([
      { supplyKey: "bottle", unitsPerKit: 1, availableUnits: 1000 },
      { supplyKey: "bottle", unitsPerKit: 1, availableUnits: 1000 },
      { supplyKey: "notebook", unitsPerKit: 1, availableUnits: 700 },
    ]);
    expect(kits).toBe(500); // 1000 / 2, not 700 and not 1000
  });
  it("stock freshness: 7-day default window", () => {
    const now = new Date("2026-09-26T00:00:00Z");
    expect(stockState(new Date("2026-09-20T00:00:00Z"), "ready_stock", now)).toBe("fresh");
    expect(stockState(new Date("2026-09-10T00:00:00Z"), "ready_stock", now)).toBe("stale");
    expect(stockState(null, "ready_stock", now)).toBe("unknown");
    expect(stockState(null, "made_to_order", now)).toBe("made_to_order");
  });
});

describe("quote calculation", () => {
  it("spec worked example: 300 units, ₹700 sell, 18% GST, supplier cost with branding, setup and fulfilment", () => {
    const r = calculateQuote({
      lines: [{ lineNo: 1, quantity: 300, unitPriceMinor: 70000, taxRateBp: 1800, cost: { unitCostMinor: 50000, brandingUnitCostMinor: 2500, setupChargeMinor: 150000, allocatedFulfilmentMinor: 60000 } }],
      charges: [{ label: "Freight", amountMinor: 200000, taxRateBp: 1800 }],
      discountMinor: 100000,
      marginFloorBp: 1500,
    });
    expect(r.subtotalMinor).toBe(21_000_000);
    expect(r.chargesMinor).toBe(200_000);
    expect(r.preTaxTotalMinor).toBe(21_100_000);
    expect(r.taxMinor).toBe(3_780_000 + 36_000);
    expect(r.totalMinor).toBe(21_100_000 + 3_816_000);
    expect(r.totalCostMinor).toBe(15_960_000);
    expect(r.grossMarginBp).toBe(Math.round(((21_100_000 - 15_960_000) * 10000) / 21_100_000));
    expect(r.needsMarginApproval).toBe(false);
  });
  it("flags margin below floor and refuses discount > pre-tax", () => {
    const low = calculateQuote({ lines: [{ lineNo: 1, quantity: 10, unitPriceMinor: 1000, taxRateBp: 0, cost: { unitCostMinor: 950, brandingUnitCostMinor: 0, setupChargeMinor: 0, allocatedFulfilmentMinor: 0 } }], charges: [], discountMinor: 0, marginFloorBp: 1500 });
    expect(low.needsMarginApproval).toBe(true);
    expect(() => calculateQuote({ lines: [{ lineNo: 1, quantity: 1, unitPriceMinor: 100, taxRateBp: 0, cost: { unitCostMinor: 0, brandingUnitCostMinor: 0, setupChargeMinor: 0, allocatedFulfilmentMinor: 0 } }], charges: [], discountMinor: 101 })).toThrow(/Discount/);
  });
});

describe("enquiry state machine (spec §10)", () => {
  it("allows only the documented transitions", () => {
    expect(canTransition("submitted", "qualified")).toBe(true);
    expect(canTransition("submitted", "quoted")).toBe(false);
    expect(canTransition("quoted", "sourcing")).toBe(true);
    expect(canTransition("accepted", "order_confirmed")).toBe(true);
    expect(canTransition("accepted", "closed")).toBe(false);
    expect(canTransition("closed", "qualified")).toBe(true);
    expect(canTransition("order_confirmed", "closed")).toBe(false);
  });
});

describe("permission matrix (spec §3)", () => {
  it("vendor managers never get platform pricing or approval rights", () => {
    expect(VENDOR_ROLE_PERMISSIONS.manager.has("offer:write")).toBe(true);
    expect([...VENDOR_ROLE_PERMISSIONS.manager]).not.toContain("catalog:publish");
  });
  it("sales cannot publish content or set public prices; admin cannot manage roles; owner can", () => {
    expect(ROLE_PERMISSIONS.sales.has("catalog:publish")).toBe(false);
    expect(ROLE_PERMISSIONS.sales.has("catalog:set_public_price")).toBe(false);
    expect(ROLE_PERMISSIONS.sales.has("quotes:draft")).toBe(true);
    expect(ROLE_PERMISSIONS.admin.has("roles:manage")).toBe(false);
    expect(ROLE_PERMISSIONS.owner.has("roles:manage")).toBe(true);
    expect(permissionsForRoles(["sales", "catalog_editor"]).has("catalog:publish")).toBe(true);
  });
});

describe("public price basis (spec §6)", () => {
  const mk = (minQuantity: number, unitPriceMinor: number | null, mode: "from" | "request_quote" = "from") =>
    ({ id: "x", productId: "p", variantId: null, mode, minQuantity, unitPriceMinor, currency: "INR", includesTax: false, includesBranding: false, includesShipping: false, effectiveFrom: new Date(), effectiveUntil: null, createdBy: null, createdAt: new Date() }) as never;
  it("does not show a 1,000-unit price to a buyer asking for 100 units", () => {
    const entries = [mk(100, 80000), mk(1000, 60000)];
    expect(pickPrice(entries, 100).unitPriceMinor).toBe(80000);
    expect(pickPrice(entries, 1000).unitPriceMinor).toBe(60000);
    expect(pickPrice(entries, 50).mode).toBe("request_quote");
    expect(pickPrice(entries, null)).toMatchObject({ unitPriceMinor: 80000, qualifyingQuantity: 100 });
  });
  it("never fabricates ₹0", () => {
    expect(pickPrice([mk(1, null, "request_quote")], 500)).toMatchObject({ mode: "request_quote", unitPriceMinor: null });
  });
});
