"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconClose, IconMenu } from "@/components/ui/icons";

export interface NavGroup { label: string; href: string; items?: Array<{ label: string; href: string }> }

export function MobileNav({ groups, account }: { groups: NavGroup[]; account: Array<{ label: string; href: string }> }) {
  // Open state is keyed to the pathname, so navigating closes the menu without an effect.
  const pathname = usePathname();
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const setOpen = (v: boolean | ((prev: boolean) => boolean)) => setOpenFor((prev) => ((typeof v === "function" ? v(prev === pathname) : v) ? pathname : null));
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenFor(null); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);
  return (
    <div className="lg:hidden">
      <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-brand-tint" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((v) => !v)}>
        {open ? <IconClose /> : <IconMenu />}
      </button>
      {open && (
        <div id="mobile-menu" role="dialog" aria-label="Site menu" className="fixed inset-x-0 bottom-0 top-[var(--header-h,4rem)] z-50 overflow-y-auto bg-surface">
          <nav className="container-x py-4">
            <form action="/search" role="search" className="mb-4 flex gap-2">
              <label htmlFor="m-search" className="sr-only">Search gifts</label>
              <input id="m-search" name="q" type="search" placeholder="Search gifts, kits or codes" className="input" />
              <button type="submit" className="btn-primary">Go</button>
            </form>
            <ul className="divide-y divide-border">
              {groups.map((g) => (
                <li key={g.label} className="py-3">
                  <Link href={g.href} className="block text-base font-semibold">{g.label}</Link>
                  {g.items && g.items.length > 0 && (
                    <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                      {g.items.map((i) => <li key={i.href}><Link href={i.href} className="block py-1 text-sm text-ink-muted hover:text-brand">{i.label}</Link></li>)}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
            <ul className="mt-4 flex flex-wrap gap-2">
              {account.map((a) => <li key={a.href}><Link href={a.href} className="chip">{a.label}</Link></li>)}
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}
