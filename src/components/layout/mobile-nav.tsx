"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconClose, IconMenu } from "@/components/ui/icons";

export interface NavGroup { label: string; href: string; items?: Array<{ label: string; href: string }> }

const noopSubscribe = () => () => {};

export function MobileNav({ groups, account }: { groups: NavGroup[]; account: Array<{ label: string; href: string }> }) {
  // Open state is keyed to the pathname, so navigating closes the menu without an effect.
  const pathname = usePathname();
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const close = () => setOpenFor(null);
  // Portal target exists only on the client; the server renders the button alone.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenFor(null); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);

  // The panel is portalled to <body>: the sticky header uses backdrop-filter, which makes it the
  // containing block for position:fixed descendants and collapsed the old in-header panel to zero height.
  const panel = (
    <div id="mobile-menu" role="dialog" aria-modal="true" aria-label="Site menu" className="fixed inset-0 z-[60] flex flex-col bg-surface lg:hidden">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
        <span className="font-display text-base font-bold">Menu</span>
        <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-brand-tint" aria-label="Close menu" onClick={close}>
          <IconClose />
        </button>
      </div>
      <nav aria-label="Mobile" className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
        <form action="/search" role="search" className="mb-4 flex gap-2">
          <label htmlFor="m-search" className="sr-only">Search gifts</label>
          <input id="m-search" name="q" type="search" placeholder="Search gifts, kits or codes" className="input min-w-0 flex-1" />
          <button type="submit" className="btn-primary shrink-0">Go</button>
        </form>
        <ul className="divide-y divide-border">
          {groups.map((g) => (
            <li key={g.label} className="py-3">
              <Link href={g.href} onClick={close} className="block py-1 text-base font-semibold">{g.label}</Link>
              {g.items && g.items.length > 0 && (
                <ul className="mt-1 grid grid-cols-2 gap-x-4">
                  {g.items.map((i) => <li key={i.href} className="min-w-0"><Link href={i.href} onClick={close} className="block truncate py-2 text-sm text-ink-muted hover:text-brand">{i.label}</Link></li>)}
                </ul>
              )}
            </li>
          ))}
        </ul>
        <ul className="mt-4 flex flex-wrap gap-2">
          {account.map((a) => <li key={a.href}><Link href={a.href} onClick={close} className="chip">{a.label}</Link></li>)}
        </ul>
      </nav>
    </div>
  );

  return (
    <div className="lg:hidden">
      <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-brand-tint" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpenFor(open ? null : pathname)}>
        {open ? <IconClose /> : <IconMenu />}
      </button>
      {open && mounted && createPortal(panel, document.body)}
    </div>
  );
}
