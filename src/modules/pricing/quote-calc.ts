import { applyBp, assertMinor, grossMarginBp, multiply } from "./money";
import { businessRule } from "@/lib/errors";

export interface QuoteLineInput {
  lineNo: number;
  quantity: number;
  unitPriceMinor: number;
  taxRateBp: number;
  /** Private cost inputs for margin; never leave the server. */
  cost: {
    unitCostMinor: number;
    brandingUnitCostMinor: number;
    setupChargeMinor: number;
    allocatedFulfilmentMinor: number;
  };
}

export interface QuoteChargeInput {
  label: string;
  amountMinor: number;
  taxRateBp: number;
}

export interface QuoteCalcInput {
  lines: QuoteLineInput[];
  charges: QuoteChargeInput[];
  discountMinor: number;
  /** Margin floor from commercial rules; below this the quote needs approval. */
  marginFloorBp?: number;
}

export interface QuoteCalcResult {
  lines: Array<{
    lineNo: number;
    lineExTaxMinor: number;
    taxMinor: number;
    lineTotalMinor: number;
    lineCostMinor: number;
    marginBp: number | null;
  }>;
  charges: Array<{ label: string; amountMinor: number; taxRateBp: number; taxMinor: number }>;
  subtotalMinor: number; // lines ex tax
  chargesMinor: number; // ex tax
  discountMinor: number;
  preTaxTotalMinor: number;
  taxMinor: number;
  totalMinor: number;
  totalCostMinor: number;
  grossMarginBp: number | null;
  needsMarginApproval: boolean;
}

/**
 * Spec §18:
 *   line cost   = unit cost × Q + branding unit cost × Q + allocated packaging/assembly + setup/freight
 *   pre-tax     = Σ(unit price × Q) + charges − discounts
 *   total       = pre-tax + tax
 *   margin %    = (revenue ex tax − cost) / revenue ex tax   (freight/charges counted as revenue; fees excluded)
 * Discount is applied at document level and does not change per-line tax (tax is on line and charge amounts).
 */
export function calculateQuote(input: QuoteCalcInput): QuoteCalcResult {
  if (input.lines.length === 0) throw businessRule("A quote needs at least one line");
  assertMinor(input.discountMinor, "discount");

  const lines = input.lines.map((l) => {
    const lineExTax = multiply(l.unitPriceMinor, l.quantity);
    const tax = applyBp(lineExTax, l.taxRateBp);
    const lineCost =
      multiply(l.cost.unitCostMinor, l.quantity) +
      multiply(l.cost.brandingUnitCostMinor, l.quantity) +
      assertMinor(l.cost.setupChargeMinor, "setup") +
      assertMinor(l.cost.allocatedFulfilmentMinor, "fulfilment");
    return {
      lineNo: l.lineNo,
      lineExTaxMinor: lineExTax,
      taxMinor: tax,
      lineTotalMinor: lineExTax + tax,
      lineCostMinor: lineCost,
      marginBp: grossMarginBp(lineExTax, lineCost),
    };
  });

  const charges = input.charges.map((c) => ({
    label: c.label,
    amountMinor: assertMinor(c.amountMinor, "charge"),
    taxRateBp: c.taxRateBp,
    taxMinor: applyBp(c.amountMinor, c.taxRateBp),
  }));

  const subtotal = lines.reduce((s, l) => s + l.lineExTaxMinor, 0);
  const chargesTotal = charges.reduce((s, c) => s + c.amountMinor, 0);
  if (input.discountMinor > subtotal + chargesTotal) throw businessRule("Discount exceeds the pre-tax amount");
  const preTax = subtotal + chargesTotal - input.discountMinor;
  const tax = lines.reduce((s, l) => s + l.taxMinor, 0) + charges.reduce((s, c) => s + c.taxMinor, 0);
  const totalCost = lines.reduce((s, l) => s + l.lineCostMinor, 0);
  const margin = grossMarginBp(preTax, totalCost);
  const floor = input.marginFloorBp ?? 0;

  return {
    lines,
    charges,
    subtotalMinor: subtotal,
    chargesMinor: chargesTotal,
    discountMinor: input.discountMinor,
    preTaxTotalMinor: preTax,
    taxMinor: tax,
    totalMinor: preTax + tax,
    totalCostMinor: totalCost,
    grossMarginBp: margin,
    needsMarginApproval: margin === null || margin < floor,
  };
}
