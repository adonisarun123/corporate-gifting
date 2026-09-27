import Link from "next/link";
import { listTaxonomy } from "@/modules/catalog/public";
import { Logo } from "./header";

export async function SiteFooter() {
  const tax = await listTaxonomy().catch(() => ({ categories: [], terms: [] }));
  const occasions = tax.terms.filter((t) => t.kind === "occasion");
  return (
    <footer className="mt-20 border-t border-border bg-surface">
      <div className="container-x grid gap-10 py-14 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-muted">Enquiry-led corporate gifting for teams in India. Shortlist gifts and kits, send your requirements, and receive one quotation with every inclusion stated. Working brand name; identity to be confirmed.</p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            <span className="badge-brand">Enquiry-led</span>
            <span className="badge-neutral">INR · GST basis shown</span>
            <span className="badge-neutral">Versioned quotations</span>
          </div>
        </div>
        <nav aria-label="Shop" className="text-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">Shop</p>
          <ul className="grid gap-2">
            <li><Link href="/gifts" className="hover:text-brand">All gifts</Link></li>
            <li><Link href="/combos" className="hover:text-brand">Kits & combos</Link></li>
            <li><Link href="/gift-finder" className="hover:text-brand">Gift finder</Link></li>
            {tax.categories.slice(0, 6).map((c) => <li key={c.slug}><Link href={`/categories/${c.slug}`} className="hover:text-brand">{c.name}</Link></li>)}
          </ul>
        </nav>
        <nav aria-label="Occasions" className="text-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">Occasions</p>
          <ul className="grid gap-2">{occasions.map((o) => <li key={o.slug}><Link href={`/occasions/${o.slug}`} className="hover:text-brand">{o.name}</Link></li>)}</ul>
        </nav>
        <nav aria-label="Company" className="text-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">Company</p>
          <ul className="grid gap-2">
            <li><Link href="/how-it-works" className="hover:text-brand">How it works</Link></li>
            <li><Link href="/about" className="hover:text-brand">About</Link></li>
            <li><Link href="/contact" className="hover:text-brand">Contact</Link></li>
            <li><Link href="/become-a-vendor" className="hover:text-brand">Become a vendor</Link></li>
            <li><Link href="/enquiry-cart" className="hover:text-brand">Enquiry cart</Link></li>
          </ul>
        </nav>
        <nav aria-label="Legal" className="text-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">Legal</p>
          <ul className="grid gap-2">
            <li><Link href="/privacy" className="hover:text-brand">Privacy</Link></li>
            <li><Link href="/terms" className="hover:text-brand">Terms</Link></li>
            <li><Link href="/cookies" className="hover:text-brand">Cookies</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-border">
        <div className="container-x flex flex-col gap-2 py-5 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Corporate Gifting Hub. Prices exclude GST, branding and shipping unless stated; your quotation confirms final figures.</p>
          <p>Adding to the enquiry cart never buys or reserves stock.</p>
        </div>
      </div>
    </footer>
  );
}
