import Link from "next/link";
import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="container-x py-20">
        <div className="card-elevated mx-auto max-w-lg p-10 text-center">
          <p className="eyebrow justify-center">404</p>
          <h1 className="h-section mt-3">Page not found</h1>
          <p className="mt-3 text-ink-muted">The page may have moved or the product may no longer be listed. Discontinued gifts are kept only where a genuinely equivalent replacement exists.</p>
          <div className="mt-6 flex justify-center gap-2"><Link href="/gifts" className="btn-primary">Browse gifts</Link><Link href="/search" className="btn-secondary">Search</Link></div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
