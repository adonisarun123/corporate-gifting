import Link from "next/link";
import type { PublicProductCard } from "@/modules/catalog/public";
import { PriceBasis } from "./price-basis";
import { AvailabilityBadge } from "./availability-badge";

export function ProductCard({ p }: { p: PublicProductCard }) {
  const href = p.kind === "combo" ? `/combos/${p.slug}` : `/gifts/${p.slug}`;
  return (
    <article className="card flex flex-col overflow-hidden">
      <Link href={href} className="block aspect-[4/3] bg-bg">
        {p.heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.heroImage.url} alt={p.heroImage.alt} width={800} height={600} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div aria-hidden className="flex h-full w-full items-center justify-center text-xs text-ink-muted">Image to follow</div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold leading-tight">
            <Link href={href} className="hover:underline">{p.name}</Link>
          </h3>
          <span className="shrink-0 text-xs text-ink-muted">{p.publicCode}</span>
        </div>
        {(p.recipients.length > 0 || p.occasions.length > 0) && (
          <p className="text-xs text-ink-muted">{[...p.recipients, ...p.occasions].slice(0, 3).join(" · ")}</p>
        )}
        <PriceBasis price={p.price} compact />
        <dl className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
          {p.minMoq !== null && (<div><dt className="inline">MOQ </dt><dd className="inline font-medium text-ink">{p.minMoq.toLocaleString("en-IN")}</dd></div>)}
          {p.leadTimeDays && (<div><dt className="inline">Lead time </dt><dd className="inline font-medium text-ink">{p.leadTimeDays[0]}–{p.leadTimeDays[1]} days</dd></div>)}
          <AvailabilityBadge state={p.stockState} />
        </dl>
      </div>
    </article>
  );
}
