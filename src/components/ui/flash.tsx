/** Renders ?ok= / ?error= query messages from server-action redirects. */
export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <p role="status" aria-live="polite" className={error ? "rounded-[var(--radius-control)] border border-danger bg-danger-soft px-3 py-2 text-sm text-danger" : "rounded-[var(--radius-control)] border border-success bg-success-soft px-3 py-2 text-sm text-success"}>
      {error ?? ok}
    </p>
  );
}
