import Link from "next/link";

/** Standard inner-page wrapper; the homepage composes full-bleed sections itself. */
export function PageShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`container-x py-8 lg:py-10 ${className}`}>{children}</div>;
}

export function Breadcrumbs({ items }: { items: Array<{ name: string; href?: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((it, i) => (
          <li key={`${it.name}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden className="text-ink-subtle">/</span>}
            {it.href ? <Link href={it.href} className="hover:text-brand">{it.name}</Link> : <span aria-current="page" className="text-ink">{it.name}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Editorial header for landing pages (category/occasion/recipient) — photo or gradient band. */
export function LandingHero({ eyebrow, title, body, image, gradient, children }: { eyebrow: string; title: string; body?: string | null; image?: { src: string; alt: string } | null; gradient: string; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-[18px] text-white" style={{ background: gradient }}>
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image.src} alt="" aria-hidden width={1600} height={600} className="absolute inset-0 h-full w-full object-cover opacity-60" fetchPriority="high" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-brand-deep/90 via-brand-deep/60 to-brand-deep/20" />
      <div className="relative grid gap-4 px-6 py-10 sm:px-10 lg:py-14">
        <p className="eyebrow text-white/80 [&::before]:bg-accent">{eyebrow}</p>
        <h1 className="h-section max-w-2xl text-white">{title}</h1>
        {body && <p className="max-w-2xl text-white/80">{body}</p>}
        {children}
      </div>
    </section>
  );
}
