import { formatINR } from "@/modules/pricing/money";

export function Money({ minor }: { minor: number }) {
  return <span className="tabular-nums">{formatINR(minor)}</span>;
}
