import Link from "next/link";
import { listFiltersSchema, type ListFilters, type PublicProductCard } from "@/modules/catalog/public";
import { ProductCard } from "./product-card";
import { EmptyState } from "@/components/ui/empty-state";

type Term = { slug: string; name: string };
type FilterProps = { basePath: string; filters: ListFilters; categories?: Term[]; recipients: Term[]; occasions: Term[]; hideCategory?: boolean };

const BUDGET_BANDS: Array<{ label: string; max: number }> = [
  { label: "Under ₹500", max: 500 }, { label: "Under ₹1,000", max: 1000 }, { label: "Under ₹2,500", max: 2500 }, { label: "Under ₹5,000", max: 5000 },
];

function RadioList({ name, current, options, anyLabel = "Any" }: { name: string; current?: string; options: Term[]; anyLabel?: string }) {
  return (
    <ul className="grid gap-1 text-sm">
      <li><label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-brand-tint"><input type="radio" name={name} value="" defaultChecked={!current} className="accent-brand" /> {anyLabel}</label></li>
      {options.map((o) => (
        <li key={o.slug}><label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-brand-tint"><input type="radio" name={name} value={o.slug} defaultChecked={current === o.slug} className="accent-brand" /> {o.name}</label></li>
      ))}
    </ul>
  );
}

/** Sidebar (desktop) / collapsible sheet (mobile). Plain GET form: filters persist in the URL (spec §6). */
export function ListingFilters(props: FilterProps) {
  const { filters } = props;
  const active = [filters.q, filters.category, filters.recipient, filters.occasion, filters.quantity, filters.budgetMaxMinor].filter(Boolean).length;
  return (
    <>
      <div className="card hidden lg:sticky lg:top-24 lg:block">
        <p className="border-b border-border px-4 py-3 font-semibold">Filters {active > 0 && <span className="badge-brand ml-1">{active}</span>}</p>
        <FilterForm {...props} idPrefix="d" />
      </div>
      <details className="card lg:hidden">
        <summary className="flex cursor-pointer items-center justify-between px-4 py-3 font-semibold">
          <span>Filters {active > 0 && <span className="badge-brand ml-1">{active}</span>}</span>
          <span className="text-xs font-normal text-ink-muted">Tap to open</span>
        </summary>
        <FilterForm {...props} idPrefix="m" />
      </details>
    </>
  );
}

function FilterForm({ basePath, filters, categories = [], recipients, occasions, hideCategory = false, idPrefix }: FilterProps & { idPrefix: string }) {
  const id = (s: string) => `${idPrefix}-${s}`;
  return (
      <form action={basePath} method="get" className="grid gap-5 p-4">
        <input type="hidden" name="sort" value={filters.sort} />
        <div>
          <label className="label" htmlFor={id("q")}>Keyword or code</label>
          <input id={id("q")} name="q" defaultValue={filters.q ?? ""} className="input" placeholder="bottle, notebook, CGH-P-…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor={id("qty")}>Quantity</label>
            <input id={id("qty")} name="quantity" type="number" min={1} defaultValue={filters.quantity ?? ""} className="input" placeholder="e.g. 250" />
          </div>
          <div>
            <label className="label" htmlFor={id("max")}>Max per gift (₹)</label>
            <input id={id("max")} name="budgetMaxRupees" type="number" min={0} defaultValue={filters.budgetMaxMinor ? filters.budgetMaxMinor / 100 : ""} className="input" placeholder="e.g. 1500" />
          </div>
        </div>
        <p className="-mt-3 text-xs text-ink-muted">Prices and MOQ are matched to the quantity you enter.</p>
        <div className="flex flex-wrap gap-1.5">
          {BUDGET_BANDS.map((b) => {
            const params = new URLSearchParams();
            if (filters.q) params.set("q", filters.q); if (filters.category) params.set("category", filters.category); if (filters.recipient) params.set("recipient", filters.recipient); if (filters.occasion) params.set("occasion", filters.occasion); if (filters.quantity) params.set("quantity", String(filters.quantity));
            params.set("budgetMaxRupees", String(b.max));
            const on = filters.budgetMaxMinor === b.max * 100;
            return <Link key={b.max} href={`${basePath}?${params}`} className={`chip min-h-8 px-3 text-xs ${on ? "chip-active" : ""}`} aria-current={on ? "true" : undefined}>{b.label}</Link>;
          })}
        </div>
        {!hideCategory && categories.length > 0 && (<fieldset><legend className="label">Category</legend><RadioList name="category" current={filters.category} options={categories} /></fieldset>)}
        {occasions.length > 0 && <fieldset><legend className="label">Occasion</legend><RadioList name="occasion" current={filters.occasion} options={occasions} /></fieldset>}
        {recipients.length > 0 && <fieldset><legend className="label">Recipient</legend><RadioList name="recipient" current={filters.recipient} options={recipients} /></fieldset>}
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="includeUnpriced" value="true" defaultChecked={filters.includeUnpriced} className="mt-1 accent-brand" /> Include gifts without a public price</label>
        <div className="flex gap-2">
          <button className="btn-primary flex-1" type="submit">Apply filters</button>
          <Link href={basePath} className="btn-secondary">Clear</Link>
        </div>
      </form>
  );
}

export function ActiveFilterChips({ basePath, filters, lookup }: { basePath: string; filters: ListFilters; lookup: { categories?: Term[]; recipients: Term[]; occasions: Term[] } }) {
  const chips: Array<{ key: keyof ListFilters; label: string }> = [];
  if (filters.q) chips.push({ key: "q", label: `“${filters.q}”` });
  if (filters.category) chips.push({ key: "category", label: lookup.categories?.find((c) => c.slug === filters.category)?.name ?? filters.category });
  if (filters.occasion) chips.push({ key: "occasion", label: lookup.occasions.find((c) => c.slug === filters.occasion)?.name ?? filters.occasion });
  if (filters.recipient) chips.push({ key: "recipient", label: lookup.recipients.find((c) => c.slug === filters.recipient)?.name ?? filters.recipient });
  if (filters.quantity) chips.push({ key: "quantity", label: `${filters.quantity.toLocaleString("en-IN")} units` });
  if (filters.budgetMaxMinor) chips.push({ key: "budgetMaxMinor", label: `Under ₹${(filters.budgetMaxMinor / 100).toLocaleString("en-IN")}` });
  if (chips.length === 0) return null;
  const without = (k: keyof ListFilters) => {
    const params = new URLSearchParams();
    if (filters.q && k !== "q") params.set("q", filters.q);
    if (filters.category && k !== "category") params.set("category", filters.category);
    if (filters.occasion && k !== "occasion") params.set("occasion", filters.occasion);
    if (filters.recipient && k !== "recipient") params.set("recipient", filters.recipient);
    if (filters.quantity && k !== "quantity") params.set("quantity", String(filters.quantity));
    if (filters.budgetMaxMinor && k !== "budgetMaxMinor") params.set("budgetMaxRupees", String(filters.budgetMaxMinor / 100));
    if (filters.sort !== "relevance") params.set("sort", filters.sort);
    const s = params.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label="Active filters">
      {chips.map((c) => <li key={c.key}><Link href={without(c.key)} className="chip min-h-8 px-3 text-xs" aria-label={`Remove filter ${c.label}`}>{c.label} <span aria-hidden>×</span></Link></li>)}
      <li><Link href={basePath} className="text-xs font-semibold text-brand hover:underline">Clear all</Link></li>
    </ul>
  );
}

export function SortControl({ basePath, filters, query }: { basePath: string; filters: ListFilters; query: Record<string, string | undefined> }) {
  return (
    <form action={basePath} method="get" className="flex items-center gap-2 text-sm">
      {Object.entries(query).map(([k, v]) => (v && k !== "sort" ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <label htmlFor="f-sort" className="text-ink-muted">Sort</label>
      <select id="f-sort" name="sort" defaultValue={filters.sort} className="input h-10 w-auto py-1">
        <option value="relevance">Relevance</option><option value="newest">Newly added</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="lead_time">Lead time</option>
      </select>
      <button className="btn-secondary h-10 min-h-0 px-3" type="submit">Go</button>
    </form>
  );
}

export function ListingGrid({ items, total, page, pageSize, basePath, query, columns = 3 }: { items: PublicProductCard[]; total: number; page: number; pageSize: number; basePath: string; query: Record<string, string | undefined>; columns?: 3 | 4 }) {
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
  const cols = columns === 4 ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-4" : "grid-cols-2 md:grid-cols-3";
  return (
    <div>
      <div className={`grid gap-4 lg:gap-5 ${cols}`}>{items.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 3} />)}</div>
      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-2 text-sm">
          {page > 1 && <Link rel="prev" href={link(page - 1)} className="btn-secondary">Previous</Link>}
          <span className="px-3 text-ink-muted">Page {page} of {pages}</span>
          {page < pages && <Link rel="next" href={link(page + 1)} className="btn-secondary">Next</Link>}
        </nav>
      )}
    </div>
  );
}

/** Two-column catalogue layout: filters aside + toolbar + grid. */
export function CatalogLayout({ filters, basePath, query, total, aside, children }: { filters: ListFilters; basePath: string; query: Record<string, string | undefined>; total: number; aside: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:gap-10">
      <aside aria-label="Filters">{aside}</aside>
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-muted" aria-live="polite"><strong className="text-ink">{total.toLocaleString("en-IN")}</strong> result{total === 1 ? "" : "s"}</p>
          <SortControl basePath={basePath} filters={filters} query={query} />
        </div>
        {children}
      </div>
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

/** Query object for pagination/sort links, from parsed filters. */
export function filtersToQuery(f: ListFilters): Record<string, string | undefined> {
  return { q: f.q, category: f.category, recipient: f.recipient, occasion: f.occasion, quantity: f.quantity?.toString(), budgetMaxRupees: f.budgetMaxMinor ? String(f.budgetMaxMinor / 100) : undefined, includeUnpriced: f.includeUnpriced ? undefined : "false", sort: f.sort === "relevance" ? undefined : f.sort };
}
