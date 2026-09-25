import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="container-x grid gap-8 py-10 text-sm sm:grid-cols-3">
        <div>
          <p className="font-semibold">Corporate Gifting Hub</p>
          <p className="mt-2 text-ink-muted">Enquiry-led corporate gifts and kits for teams in India. Working name; brand to be confirmed.</p>
        </div>
        <nav aria-label="Footer" className="grid gap-2">
          <Link href="/how-it-works">How it works</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/become-a-vendor">Become a vendor</Link>
        </nav>
        <nav aria-label="Legal" className="grid gap-2">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/cookies">Cookies</Link>
        </nav>
      </div>
    </footer>
  );
}
