const TONE: Record<string, string> = {
  published: "badge-success", active: "badge-success", accepted: "badge-success", fresh: "badge-success", approved: "badge-success", responded: "badge-success",
  submitted: "badge-brand", issued: "badge-brand", viewed: "badge-brand", sent: "badge-brand", quoted: "badge-brand", sourcing: "badge-brand", qualified: "badge-brand",
  draft: "badge-neutral", unknown: "badge-neutral", made_to_order: "badge-neutral", superseded: "badge-neutral", merged: "badge-neutral",
  stale: "badge-warning", paused: "badge-warning", revision_requested: "badge-warning", expired: "badge-warning", verifying: "badge-warning",
  rejected: "badge-danger", suspended: "badge-danger", closed: "badge-danger", declined: "badge-danger", archived: "badge-danger", dead: "badge-danger",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = TONE[status] ?? "badge-neutral";
  return <span className={cls}>{status.replace(/_/g, " ")}</span>;
}
