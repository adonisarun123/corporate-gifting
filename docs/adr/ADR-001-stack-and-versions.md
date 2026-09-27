# ADR-001 — Stack, pinned versions and foundation decisions

**Status:** Accepted · **Date:** 2026-09-26 · **Spec reference:** §14, §16, §17, §33

## Pinned versions (recorded at kickoff)

| Component | Version | Note |
|---|---|---|
| Node.js | 24.x everywhere (local, CI, Vercel); `engines` pins `24.x` so Vercel never auto-jumps a major | Both supported by Next 16 |
| Next.js | 16.3.6 | App Router, server components |
| React | 19.3.0 | |
| TypeScript | 5.9.3 | `strict`, `noUncheckedIndexedAccess` |
| Drizzle ORM / Kit | 0.45.3 / 0.31.11 | Kit is dev-only; its transitive esbuild advisory affects the dev server only |
| pg (node-postgres) | 8.23.0 | Interactive transactions required for audited mutations |
| PostgreSQL | 18 (Neon project `twilight-pond-28025207`, `aws-ap-southeast-1`) | Local test cluster is PG 16; no PG18-only syntax is used |
| Tailwind CSS | 4.3.3 | Tokens from spec §13 defined in `globals.css` |
| Zod | 4.6.5 | Shared client/server validation |
| Vitest | 5.0.2 | Unit + DB integration |

Update policy: Renovate/Dependabot PRs; never `latest` in production.

## Decisions

1. **Modular monolith** — `src/modules/<name>` owns validation, permissions, service methods and repository queries. Route handlers and server actions call the same service method (§15).
2. **Two database URLs** — `DATABASE_URL` (pooled endpoint, runtime role `cgh_app`, no `BYPASSRLS`, not table owner) and `DATABASE_URL_DIRECT` (direct endpoint, owner role, migrations only). Neon's pooler is transaction-mode, so every protected operation runs on one checked-out connection inside one explicit transaction with `set_config(..., true)` (transaction-local) context (§16, §17).
3. **RLS as defence in depth** — vendor-scoped tables carry `FORCE ROW LEVEL SECURITY` with default-deny policies keyed on `app.vendor_id` / `app.actor_kind`. Services still scope every query explicitly; RLS is not the primary control.
4. **Audit is transactional and append-only** — `audit_events` receives INSERT/SELECT grants only for the runtime role, plus a trigger that rejects UPDATE/DELETE. A failed audit insert rolls back the business mutation (AC-18).
5. **Outbox** — every business transaction that has side effects appends an `outbox_events` row; a leased dispatcher (`scripts/dispatch-outbox.ts`, or Inngest when keys are configured) processes it with `processed_events` idempotency.
6. **Permissions** — platform roles (`owner`, `admin`, `sales`, `catalog_editor`) map to named permission strings in `src/lib/permissions/matrix.ts`; the matrix is code, versioned and unit-tested, while grants live in `user_platform_roles`. Vendor scope comes from `vendor_memberships`, never from a submitted ID.
7. **Identity adapter** — `AUTH_PROVIDER=dev` uses seeded users behind a signed cookie for local/preview; `AUTH_PROVIDER=clerk` verifies Clerk sessions. Application membership in Neon is authoritative either way.
8. **Money** — integer minor units (paise) in `bigint` columns, `currency` alongside; rates in basis points; rounding half-up documented in `src/modules/pricing/money.ts`.
9. **References** — `CGE-YYYY-NNNNNN`, `CGQ-YYYY-NNNNNN-RNN`, `VEN-NNNN`, `CGH-P-NNNNNN`, `CGH-K-NNNNNN` are allocated from `reference_counters` under a row lock (no `MAX+1`).
10. **Public supply summary** — the storefront never joins `vendor_offers`. A `product_supply_summaries` projection (MOQ, lead-time range, stock state) is refreshed by an outbox handler on publish and stock/offer changes.

## Not adopted for the first release

Kubernetes, custom auth, separate API service, dedicated search engine, pgvector (P1), payments (P2).
