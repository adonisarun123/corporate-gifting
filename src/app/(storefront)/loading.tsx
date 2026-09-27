/**
 * Instant navigation feedback for every storefront route. Next.js shows this boundary the moment a
 * link is clicked, while the server renders the next page, so menus never look unresponsive.
 */
export default function StorefrontLoading() {
  return (
    <div className="container-x py-8 lg:py-10" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading page…</span>
      <div className="skeleton h-4 w-40" />
      <div className="skeleton mt-5 h-9 w-72 max-w-full" />
      <div className="skeleton mt-3 h-4 w-[32rem] max-w-full" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr] lg:gap-10">
        <div className="skeleton hidden h-96 lg:block" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="grid gap-2">
              <div className="skeleton aspect-square w-full" />
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
