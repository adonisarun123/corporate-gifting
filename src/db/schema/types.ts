/**
 * JSONB payload types. Validation lives in the owning module's zod schema;
 * these are the persisted shapes.
 */

export type PriceMode = "from" | "indicative" | "request_quote";

export interface ProductContent {
  name: string;
  shortSummary: string;
  description: string;
  keyBenefits: string[];
  recipientSuitability: string;
  limitations?: string;
  careInstructions?: string;
  specifications: Array<{ name: string; value: string; unit?: string }>;
  brandingMethods: string[]; // [] means "none" explicitly
  brandingNotes?: string;
  faqs: Array<{ question: string; answer: string }>;
  seo?: { title?: string; description?: string; noindex?: boolean };
}

export interface VariantOptions {
  colour?: string;
  size?: string;
  capacity?: { value: number; unit: string };
  [key: string]: unknown;
}

export interface EnquiryBudget {
  currency: "INR";
  perRecipientMinor: number;
  includesTax: boolean;
  includesBranding: boolean;
  includesShipping: boolean;
}

export interface EnquiryDestination {
  country: string;
  city?: string;
  postalCode: string;
}

export interface CartConfiguration {
  branding?: { method: string; placement?: string; colours?: number; artworkRef?: string };
  instructions?: string;
  requiredBy?: string; // ISO date
  destinationPostalCode?: string;
}

/** Frozen at submission. Never rewritten by later catalogue edits. */
export interface EnquiryItemSnapshot {
  productId: string;
  productRevisionId: string | null;
  publicCode: string;
  name: string;
  kind: "product" | "combo";
  variantId: string | null;
  variantLabel: string | null;
  variantSku: string | null;
  quantity: number;
  unit: "item" | "kit";
  configuration: CartConfiguration;
  estimate: EstimateSnapshot | null;
  components?: Array<{ variantId: string; sku: string; label: string; unitsPerKit: number }>;
  capturedAt: string;
}

export interface EstimateSnapshot {
  mode: PriceMode;
  unitPriceMinor: number | null;
  currency: "INR";
  qualifyingQuantity: number | null;
  includesTax: boolean;
  includesBranding: boolean;
  includesShipping: boolean;
  calculatedAt: string;
}

export interface QuoteTermsSnapshot {
  validityDays: number;
  paymentTerms: string;
  deliveryTerms: string;
  leadTimeAssumptions: string;
  inclusions: string;
  termsVersion: string;
  quoteContact: { name: string; email: string };
}

/** The customer-facing document. Contains NO supplier codes, costs or margins. */
export interface QuoteCustomerDocument {
  quoteNumber: string;
  revisionNo: number;
  issuedAt: string | null;
  validUntil: string;
  currency: "INR";
  customer: { companyName: string; contactName: string };
  lines: Array<{
    lineNo: number;
    publicCode: string;
    description: string;
    variantLabel: string | null;
    quantity: number;
    unit: "item" | "kit";
    unitPriceMinor: number;
    taxRateBp: number;
    taxMinor: number;
    lineTotalMinor: number;
    inclusions: string;
  }>;
  charges: Array<{ label: string; amountMinor: number; taxRateBp: number; taxMinor: number }>;
  discountMinor: number;
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
  terms: QuoteTermsSnapshot;
}

/** Private costing snapshot stored separately from the customer document. */
export interface QuoteCostingSnapshot {
  lines: Array<{
    lineNo: number;
    supplierRequestItemId: string | null;
    supplierResponseId: string | null;
    vendorId: string | null;
    unitCostMinor: number;
    setupChargeMinor: number;
    brandingUnitCostMinor: number;
    allocatedFulfilmentMinor: number;
    lineCostMinor: number;
    lineRevenueExTaxMinor: number;
    marginBp: number;
  }>;
  totalCostMinor: number;
  totalRevenueExTaxMinor: number;
  grossMarginBp: number;
}
