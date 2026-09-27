import type { PublicPrice } from "@/modules/catalog/public";
import { formatINR } from "@/modules/pricing/money";

/** Spec §7: the exact basis is always shown; unknown prices say "Request a quote", never ₹0. */
export function PriceBasis({ price, compact = false, unit = "gift" }: { price: PublicPrice; compact?: boolean; unit?: "gift" | "kit" }) {
  if (price.mode === "request_quote" || price.unitPriceMinor === null) {
    return (
      <div>
        <p className="text-sm font-semibold text-ink">Request a quote</p>
        {!compact && <p className="text-xs text-ink-muted">No public price is set for this item yet. Add it to your enquiry and we will price it in your quotation.</p>}
      </div>
    );
  }
  const label = price.mode === "indicative" ? "Indicative budget" : "From";
  const plural = unit === "kit" ? "kits" : "units";
  const incl = [
    price.includesTax ? "includes GST" : "excludes GST",
    price.includesBranding ? "includes branding" : "excludes custom branding",
    price.includesShipping ? "includes shipping" : "excludes shipping",
  ];
  return (
    <div>
      <p className={compact ? "text-sm" : "text-base"}>
        <span className="text-ink-muted">{label} </span>
        <span className={`font-display font-bold text-ink ${compact ? "text-lg" : "text-2xl"}`}>{formatINR(price.unitPriceMinor)}</span>
        <span className="text-ink-muted"> per {unit}{price.qualifyingQuantity ? ` for ${price.qualifyingQuantity.toLocaleString("en-IN")} ${plural}` : ""}</span>
      </p>
      {!compact && <p className="mt-1 text-xs text-ink-muted">{incl.join(", ")}. Final price and delivery schedule are confirmed in your quotation.</p>}
    </div>
  );
}
