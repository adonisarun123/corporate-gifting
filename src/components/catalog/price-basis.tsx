import type { PublicPrice } from "@/modules/catalog/public";
import { formatINR } from "@/modules/pricing/money";

/** Spec §7: the exact basis is always shown; unknown prices say "Request a quote", never ₹0. */
export function PriceBasis({ price, compact = false }: { price: PublicPrice; compact?: boolean }) {
  if (price.mode === "request_quote" || price.unitPriceMinor === null) {
    return <p className="text-sm font-semibold text-ink">Request a quote</p>;
  }
  const label = price.mode === "indicative" ? "Indicative budget" : "From";
  const incl = [
    price.includesTax ? "includes GST" : "excludes GST",
    price.includesBranding ? "includes branding" : "excludes custom branding",
    price.includesShipping ? "includes shipping" : "excludes shipping",
  ];
  return (
    <div>
      <p className="text-sm">
        <span className="text-ink-muted">{label} </span>
        <span className="text-lg font-semibold text-ink">{formatINR(price.unitPriceMinor)}</span>
        <span className="text-ink-muted"> per gift{price.qualifyingQuantity ? ` for ${price.qualifyingQuantity.toLocaleString("en-IN")} units` : ""}</span>
      </p>
      {!compact && <p className="text-xs text-ink-muted">{incl.join(", ")}. Final price and delivery schedule are confirmed in your quotation.</p>}
    </div>
  );
}
