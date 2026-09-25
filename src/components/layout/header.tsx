import Link from "next/link";
import { getActor } from "@/lib/auth/session";
import { isAuthenticated, isPlatformStaff } from "@/modules/identity/actor";

export async function SiteHeader() {
  const actor = await getActor();
  const signedIn = isAuthenticated(actor);
  const isVendor = signedIn && actor.memberships.some((m) => m.status === "active");
  const isStaff = isPlatformStaff(actor);
  return (
    <header className="border-b border-border bg-surface">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-surface focus:p-2">Skip to content</a>
      <div className="container-x flex min-h-16 flex-wrap items-center gap-x-6 gap-y-2 py-2">
        <Link href="/" className="text-lg font-bold tracking-tight text-brand">Corporate Gifting Hub</Link>
        <form action="/search" role="search" className="order-last flex w-full gap-2 sm:order-none sm:w-auto sm:flex-1 sm:max-w-md">
          <label htmlFor="site-search" className="sr-only">Search gifts</label>
          <input id="site-search" name="q" type="search" placeholder="Search gifts, kits or codes" className="input" />
          <button type="submit" className="btn-secondary">Search</button>
        </form>
        <nav aria-label="Primary" className="flex items-center gap-4 text-sm font-medium">
          <Link href="/gifts" className="hover:text-brand">Gifts</Link>
          <Link href="/combos" className="hover:text-brand">Combos</Link>
          <Link href="/gift-finder" className="hover:text-brand">Gift finder</Link>
          <Link href="/enquiry-cart" className="btn-secondary">Enquiry cart</Link>
          {isStaff && <Link href="/admin/dashboard" className="hover:text-brand">Admin</Link>}
          {isVendor && <Link href="/vendor/dashboard" className="hover:text-brand">Vendor</Link>}
          {signedIn ? (
            <Link href="/account" className="hover:text-brand">Account</Link>
          ) : (
            <Link href="/sign-in" className="hover:text-brand">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
