/** Text + icon alongside colour; stale stock never claims immediate delivery (spec §7). */
export function AvailabilityBadge({ state }: { state: string }) {
  switch (state) {
    case "fresh":
      return <span className="badge-success">● Stock reported recently</span>;
    case "made_to_order":
      return <span className="badge-neutral">◷ Made to order</span>;
    case "stale":
      return <span className="badge-warning">! Availability to be confirmed</span>;
    default:
      return <span className="badge-neutral">? Availability on request</span>;
  }
}
