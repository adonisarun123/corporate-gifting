import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, PageShell } from "@/components/layout/page-shell";
import { HERO_IMAGES, unsplash } from "@/components/catalog/visuals";

export const metadata: Metadata = { title: "About", description: "Corporate Gifting Hub is an enquiry-led B2B gifting platform for teams in India.", alternates: { canonical: "/about" } };

export default function Page() {
  return (
    <PageShell>
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "About" }]} />
      <div className="mt-4 grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="eyebrow">About</p>
          <h1 className="h-section mt-2">Gifting as procurement, done properly</h1>
          <div className="prose-basic mt-4 text-ink-muted">
            <p>Corporate Gifting Hub is a working name for an enquiry-led corporate gifting service. Our team owns the customer relationship and issues every quotation; suppliers maintain their own supply information behind the scenes.</p>
            <p>The platform separates what customers see (a public product) from how it is supplied (one or more private vendor offers). That lets us compare suppliers on cost, stock freshness and reliability, substitute when needed, and still present you with one coherent quote.</p>
            <p>Claims about materials, certifications and sustainability appear only when we hold evidence for them. Unknown facts stay unknown until verified.</p>
          </div>
          <div className="mt-6 flex gap-3"><Link href="/how-it-works" className="btn-primary">How it works</Link><Link href="/become-a-vendor" className="btn-secondary">Supply to us</Link></div>
        </div>
        <div className="overflow-hidden rounded-[20px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={unsplash(HERO_IMAGES.team.id, 1000, 800)} alt={HERO_IMAGES.team.alt} width={1000} height={800} className="aspect-[5/4] w-full object-cover" />
        </div>
      </div>
    </PageShell>
  );
}
