/**
 * Money is integer minor units (paise). Rates are basis points (10000 = 100%).
 * Rounding: half-up to the nearest minor unit, applied once per line, documented finance rule.
 */

export const MAX_MINOR = 9_000_000_000_000_000; // < 2^53; well above any realistic quote

export function assertMinor(value: number, label = "amount"): number {
  if (!Number.isInteger(value) || value < 0 || value > MAX_MINOR) {
    throw new RangeError(`${label} must be a non-negative integer in minor units`);
  }
  return value;
}

/** Round half-up a non-negative rational value to an integer. */
export function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5);
}

/** amount × rateBp / 10000, rounded half-up. */
export function applyBp(amountMinor: number, rateBp: number): number {
  assertMinor(amountMinor);
  if (!Number.isInteger(rateBp) || rateBp < 0) throw new RangeError("rateBp must be a non-negative integer");
  // Exact integer arithmetic before the single rounding step.
  return roundHalfUp((amountMinor * rateBp) / 10_000);
}

export function multiply(unitMinor: number, quantity: number): number {
  assertMinor(unitMinor, "unit price");
  if (!Number.isInteger(quantity) || quantity <= 0) throw new RangeError("quantity must be a positive integer");
  const total = unitMinor * quantity;
  return assertMinor(total, "line total");
}

/**
 * Selling price before tax that achieves a target gross MARGIN (not markup).
 * cost 80000 (₹800) at 2000 bp (20%) → 100000 (₹1,000), not 96000.
 */
export function priceForTargetMargin(costMinor: number, targetMarginBp: number): number {
  assertMinor(costMinor, "cost");
  if (targetMarginBp < 0 || targetMarginBp >= 10_000) throw new RangeError("margin must be in [0, 10000)");
  return roundHalfUp((costMinor * 10_000) / (10_000 - targetMarginBp));
}

/** Gross margin in basis points: (revenue ex tax − cost) / revenue ex tax. Returns null when revenue is 0. */
export function grossMarginBp(revenueExTaxMinor: number, costMinor: number): number | null {
  assertMinor(revenueExTaxMinor, "revenue");
  assertMinor(costMinor, "cost");
  if (revenueExTaxMinor === 0) return null;
  return Math.round(((revenueExTaxMinor - costMinor) * 10_000) / revenueExTaxMinor);
}

export function formatINR(minor: number): string {
  const rupees = Math.floor(minor / 100);
  const paise = minor % 100;
  const formatted = new Intl.NumberFormat("en-IN").format(rupees);
  return paise === 0 ? `₹${formatted}` : `₹${formatted}.${String(paise).padStart(2, "0")}`;
}
