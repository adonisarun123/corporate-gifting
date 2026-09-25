import Link from "next/link";
import { listFiltersSchema, type ListFilters, type PublicProductCard } from "@/modules/catalog/public";
import { ProductCard } from "./product-card";
import { EmptyState } from "@/components/ui/empty-state";

export function ListingFilters({ basePath, filters, categories, recipients, occasions }: { basePath: string; filters: ListFilters; categories: Array<{ slug: string; name: string }>; recipients: Array<{ slug: string; name: string }>; occasions: Array<{ slug: string; name: string }> }) {
  return (
    <form action={basePath} method="get" className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
      <div><label className="label" htmlFor="f-q">Keyword</label><input id="f-q" name="q" defaultValue={filters.q ?? ""} className="input" /></div>
      <div><label className="label" htmlFor="f-cat">Category</label>
        <select id="f-cat" name="category" defaultValue={filters.category ?? ""} className="input"><option value="">Any</option>{categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></div>
      <div><label className="label" htmlFor="f-rec">Recipient</label>
        <select id="f-rec" name="recipient" defaultValue={filters.recipient ?? ""} className="input"><option value="">Any</option>{recipients.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></div>
      <div><label className="label" htmlFor="f-occ">Occasion</label>
        <select id="f-occ" name="occasion" defaultValue={filters.occasion ?? ""} className="input"><option value="">Any</option>{occasions.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></div>
      <div><label className="label" htmlFor="f-qty">Quantity</label><input id="f-qty" name="quantity" type="number" min={1} defaultValue={filters.quantity ?? ""} className="input" /><p className="help">Prices and MOQ are matched to this quantity.</p></div>
      <div><label className="label" htmlFor="f-max">Max per gift (₹)</label><input id="f-max" name="budgetMaxRupees" type="number" min={0} defaultValue={filters.budgetMaxMinor ? filters.budgetMaxMinor / 100 : ""} className="input" /></div>
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-6">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="includeUnpriced" value="true" defaultChecked={filters.includeUnpriced} /> Include gifts without a public price</label>
        <div className="ml-auto flex gap-2">
          <label className="sr-only" htmlFor="f-sort">Sort</label>
          <select id="f-sort" name="sort" defaultValue={filters.sort} className="input w-auto">
            <option value="relevance">Relevance</option><option value="newest">Newly added</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="lead_time">Lead time</option>
          </select>
          <button className="btn-primary" type="submit">Apply</button>
          <Link href={basePath} className="btn-secondary">Clear all</Link>
        </div>
      </div>
    </form>
  );
}

export function ListingGrid({ items, total, page, pageSize, basePath, query }: { items: PublicProductCard[]; total: number; page: number; pageSize: number; basePath: string; query: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const link = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v) params.set(k, v);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  if (items.length === 0) {
    return <EmptyState title="No gifts match these constraints" body="Try relaxing the quantity or budget, or send us a sourcing brief and we will propose options." action={{ href: "/enquiry-cart?brief=1", label: "Send a sourcing brief" }} />;
  }
  return (
    <div>
      <p className="mb-3 text-sm text-ink-muted" aria-live="polite">{total.toLocaleString("en-IN")} result{total === 1 ? "" : "s"}</p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{items.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-2 text-sm">
          {page > 1 && <Link rel="prev" href={link(page - 1)} className="btn-secondary">Previous</Link>}
          <span className="px-2">Page {page} of {pages}</span>
          {page < pages && <Link rel="next" href={link(page + 1)} className="btn-secondary">Next</Link>}
        </nav>
      )}
    </div>
  );
}

export function parseListingSearchParams(sp: Record<string, string | string[] | undefined>, fixed: Partial<ListFilters> = {}): ListFilters {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k]) || undefined;
  const maxR = one("budgetMaxRupees");
  const raw = {
    q: one("q"), category: one("category"), recipient: one("recipient"), occasion: one("occasion"), quantity: one("quantity"),
    budgetMaxMinor: maxR ? String(Math.round(Number(maxR) * 100)) : undefined,
    includeUnpriced: one("includeUnpriced") ?? (Object.keys(sp).length ? "false" : "true"),
    sort: one("sort"), page: one("page"),
    ...fixed,
  };
  const parsed = listFiltersSchema.safeParse(raw);
  return parsed.success ? parsed.data : listFiltersSchema.parse({});
}
