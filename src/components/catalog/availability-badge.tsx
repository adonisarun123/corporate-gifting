/** Text + icon alongside colour; stale stock never claims immediate delivery (spec §7). */
export function AvailabilityBadge({ state, compact = false }: { state: string; compact?: boolean }) {
  switch (state) {
    case "fresh":
      return <span className="badge-success">● {compact ? "Stock reported" : "Stock reported recently"}</span>;
    case "made_to_order":
      return <span className="badge-neutral">◷ Made to order</span>;
    case "stale":
      return <span className="badge-warning">! {compact ? "To be confirmed" : "Availability to be confirmed"}</span>;
    default:
      return <span className="badge-neutral">? {compact ? "On request" : "Availability on request"}</span>;
  }
}
