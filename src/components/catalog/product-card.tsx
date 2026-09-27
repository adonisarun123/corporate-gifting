import Link from "next/link";
import type { PublicProductCard } from "@/modules/catalog/public";
import { PriceBasis } from "./price-basis";
import { AvailabilityBadge } from "./availability-badge";
import { tileGradient } from "./visuals";
import { IconArrow } from "@/components/ui/icons";

export function ProductCard({ p, priority = false }: { p: PublicProductCard; priority?: boolean }) {
  const href = p.kind === "combo" ? `/combos/${p.slug}` : `/gifts/${p.slug}`;
  const cue = [...p.occasions, ...p.recipients].slice(0, 2);
  return (
    <article className="card card-hover group relative flex flex-col overflow-hidden">
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-surface-2" tabIndex={-1} aria-hidden>
        {p.heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.heroImage.url} alt="" width={800} height={600} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/80" style={{ background: tileGradient(p.slug) }}>
            <span className="rounded-full border border-white/30 px-3 py-1 text-xs">Photography to follow</span>
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-1.5">
          {p.kind === "combo" && <span className="badge-accent shadow-sm">Kit</span>}
          {p.categoryName && p.kind !== "combo" && <span className="badge-neutral bg-white/90 shadow-sm">{p.categoryName}</span>}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div>
          <h3 className="text-[15px] font-semibold leading-snug">
            <Link href={href} className="after:absolute after:inset-0 hover:text-brand">{p.name}</Link>
          </h3>
          {cue.length > 0 && <p className="mt-1 text-xs text-ink-muted">{cue.join(" · ")}</p>}
        </div>
        <PriceBasis price={p.price} compact unit={p.kind === "combo" ? "kit" : "gift"} />
        <dl className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border pt-3 text-xs text-ink-muted">
          {p.minMoq !== null && (<div><dt className="inline">MOQ </dt><dd className="inline font-semibold text-ink">{p.minMoq.toLocaleString("en-IN")}</dd></div>)}
          {p.leadTimeDays && (<div><dt className="inline">Lead </dt><dd className="inline font-semibold text-ink">{p.leadTimeDays[0]}–{p.leadTimeDays[1]} days</dd></div>)}
          <div className="ml-auto">{p.kind === "combo" ? <span className="badge-neutral">◷ Assembled to order</span> : <AvailabilityBadge state={p.stockState} compact />}</div>
        </dl>
        <div className="flex items-center justify-between text-xs">
          <span className="truncate text-ink-subtle">{p.publicCode}</span>
          <span className="inline-flex items-center gap-1 font-semibold text-brand opacity-0 transition-opacity group-hover:opacity-100">View <IconArrow width={14} height={14} /></span>
        </div>
      </div>
    </article>
  );
}
