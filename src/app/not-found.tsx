import Link from "next/link";
import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="container-x py-16">
        <div className="card mx-auto max-w-lg p-8 text-center">
          <h1 className="text-2xl font-bold">Page not found</h1>
          <p className="mt-2 text-sm text-ink-muted">The page may have moved or the product may no longer be listed.</p>
          <Link href="/gifts" className="btn-primary mt-4">Browse gifts</Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
