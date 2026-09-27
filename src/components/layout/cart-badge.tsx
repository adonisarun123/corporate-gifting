"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconCart } from "@/components/ui/icons";

/** Live line count for the enquiry cart. Reads the server cart (never buys or reserves). */
export function CartBadge({ compact = false }: { compact?: boolean }) {
  const [count, setCount] = useState<number | null>(null);
  const pathname = usePathname();
  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/carts/current", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((c: { items?: unknown[] } | null) => { if (!cancelled) setCount(c?.items?.length ?? 0); })
      .catch(() => { if (!cancelled) setCount(0); });
    return () => { cancelled = true; };
  }, [pathname]);
  return (
    <Link href="/enquiry-cart" className={compact ? "relative inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-brand-tint" : "btn-primary relative"} aria-label={`Enquiry cart${count ? `, ${count} line${count === 1 ? "" : "s"}` : ""}`}>
      <IconCart />
      {!compact && <span>Enquiry cart</span>}
      {count ? <span className={`absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold ${compact ? "bg-accent text-white" : "bg-accent text-white"}`}>{count}</span> : null}
    </Link>
  );
}
