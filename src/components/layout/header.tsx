import Link from "next/link";
import { getActor } from "@/lib/auth/session";
import { isAuthenticated, isPlatformStaff } from "@/modules/identity/actor";
import { listTaxonomy } from "@/modules/catalog/public";
import { IconChevron, IconSearch } from "@/components/ui/icons";
import { CartBadge } from "./cart-badge";
import { MobileNav, type NavGroup } from "./mobile-nav";

/* Factual capability statements only (spec §13: no invented counters, scarcity or unverified logos). */
const TRUST = [
  "Custom branding on every gift",
  "MOQ and lead time on every card",
  "GST basis stated on every price",
  "Multi-supplier sourcing, compared privately",
  "One versioned quotation, every inclusion listed",
  "Nothing is bought or reserved until you accept",
  "Pan-India delivery, confirmed per destination",
];

export function TrustStrip() {
  const items = [...TRUST, ...TRUST];
  return (
    <div className="bg-brand-deep text-white" aria-label="What we offer">
      <div className="marquee container-x">
        <ul className="marquee-track py-2 text-[11px] font-semibold uppercase tracking-[0.14em]">
          {items.map((t, i) => (
            <li key={i} className="flex items-center gap-3 pr-10 whitespace-nowrap" aria-hidden={i >= TRUST.length}>
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />{t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 ${light ? "text-white" : "text-ink"}`} aria-label="Corporate Gifting Hub home">
      <span className={`grid h-9 w-9 place-items-center rounded-[10px] ${light ? "bg-white text-brand-deep" : "bg-brand text-white"}`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 9h16v4H4zM6 13h12v7H6zM12 9v11" /><path d="M12 9c-2-4-6-4-6-1 0 1.5 2 1 6 1Zm0 0c2-4 6-4 6-1 0 1.5-2 1-6 1Z" /></svg>
      </span>
      <span className="font-display text-[1.05rem] font-bold leading-none tracking-tight">Corporate Gifting<span className={light ? "text-accent" : "text-brand"}> Hub</span></span>
    </Link>
  );
}

function Dropdown({ label, href, columns }: { label: string; href: string; columns: Array<{ heading: string; items: Array<{ label: string; href: string }>; footer?: { label: string; href: string } }> }) {
  return (
    <li className="group relative">
      <Link href={href} className="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold hover:text-brand">{label}<IconChevron width={14} height={14} className="transition-transform group-hover:rotate-180" /></Link>
      <div className="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="card-elevated grid min-w-[520px] gap-6 p-6" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
          {columns.map((c) => (
            <div key={c.heading}>
              <p className="eyebrow mb-3">{c.heading}</p>
              <ul className="grid gap-1">
                {c.items.map((i) => <li key={i.href}><Link href={i.href} className="block rounded-md px-2 py-1.5 text-sm text-ink hover:bg-brand-tint hover:text-brand-strong">{i.label}</Link></li>)}
              </ul>
              {c.footer && <Link href={c.footer.href} className="mt-3 inline-block px-2 text-sm font-semibold text-brand hover:underline">{c.footer.label} →</Link>}
            </div>
          ))}
        </div>
      </div>
    </li>
  );
}

export async function SiteHeader() {
  const [actor, tax] = await Promise.all([getActor(), listTaxonomy().catch(() => ({ categories: [], terms: [] }))]);
  const signedIn = isAuthenticated(actor);
  const isVendor = signedIn && actor.memberships.some((m) => m.status === "active");
  const isStaff = isPlatformStaff(actor);
  const categories = tax.categories.map((c) => ({ label: c.name, href: `/categories/${c.slug}` }));
  const occasions = tax.terms.filter((t) => t.kind === "occasion").map((t) => ({ label: t.name, href: `/occasions/${t.slug}` }));
  const recipients = tax.terms.filter((t) => t.kind === "recipient").map((t) => ({ label: t.name, href: `/recipients/${t.slug}` }));

  const groups: NavGroup[] = [
    { label: "Gifts", href: "/gifts", items: categories },
    { label: "Kits & combos", href: "/combos" },
    { label: "Occasions", href: "/gifts", items: occasions },
    { label: "Recipients", href: "/gifts", items: recipients },
    { label: "Gift finder", href: "/gift-finder" },
    { label: "How it works", href: "/how-it-works" },
  ];
  const account = [
    ...(isStaff ? [{ label: "Admin", href: "/admin/dashboard" }] : []),
    ...(isVendor ? [{ label: "Vendor portal", href: "/vendor/dashboard" }] : []),
    signedIn ? { label: "My account", href: "/account" } : { label: "Sign in", href: "/sign-in" },
    { label: "Become a vendor", href: "/become-a-vendor" },
  ];

  return (
    <>
      <TrustStrip />
      <header className="header-sticky" style={{ "--header-h": "4.25rem" } as React.CSSProperties}>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-surface focus:p-2">Skip to content</a>
        <div className="container-x flex h-[4.25rem] items-center gap-4">
          <Logo />
          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center">
              <Dropdown label="Gifts" href="/gifts" columns={[{ heading: "By category", items: categories.slice(0, 10), footer: { label: "All gifts", href: "/gifts" } }, { heading: "Ready kits", items: [{ label: "Curated kits & combos", href: "/combos" }, { label: "Onboarding kits", href: "/occasions/onboarding" }, { label: "Festive hampers", href: "/occasions/festive-gifting" }, { label: "Build a bespoke kit", href: "/contact" }], footer: { label: "Explore kits", href: "/combos" } }]} />
              <Dropdown label="Occasions" href="/gifts" columns={[{ heading: "Occasion", items: occasions }, { heading: "Recipient", items: recipients }]} />
              <li><Link href="/combos" className="inline-flex whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold hover:text-brand">Kits</Link></li>
              <li><Link href="/gift-finder" className="inline-flex whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold hover:text-brand">Gift finder</Link></li>
              <li><Link href="/how-it-works" className="inline-flex whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold hover:text-brand">How it works</Link></li>
            </ul>
          </nav>
          <form action="/search" role="search" className="ml-auto hidden md:flex md:w-64 lg:w-72">
            <label htmlFor="site-search" className="sr-only">Search gifts</label>
            <div className="relative w-full">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" width={18} height={18} />
              <input id="site-search" name="q" type="search" placeholder="Search gifts, kits or codes" className="input h-11 pl-10" />
            </div>
          </form>
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <Link href={signedIn ? "/account" : "/sign-in"} className="hidden whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold hover:text-brand lg:inline-flex">{signedIn ? "Account" : "Sign in"}</Link>
            {isStaff && <Link href="/admin/dashboard" className="hidden rounded-md px-3 py-2 text-sm font-semibold text-brand hover:underline lg:inline-flex">Admin</Link>}
            {isVendor && <Link href="/vendor/dashboard" className="hidden rounded-md px-3 py-2 text-sm font-semibold text-brand hover:underline lg:inline-flex">Vendor</Link>}
            <span className="hidden lg:inline-flex"><CartBadge /></span>
            <span className="lg:hidden"><CartBadge compact /></span>
            <MobileNav groups={groups} account={account} />
          </div>
        </div>
      </header>
    </>
  );
}
