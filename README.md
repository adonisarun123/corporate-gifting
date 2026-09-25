# Corporate Gifting Hub

Enquiry-led B2B corporate gifting platform (working name). Next.js 16 · TypeScript · Neon PostgreSQL · Drizzle.

Built to `docs/` spec §33: public products and variants are separate from private vendor offers; customers submit an enquiry cart with immutable line snapshots; vendors manage only their own offers, costs and stock; the platform approves content, sets customer prices, sources privately and issues immutable quote revisions. Permissions are enforced in server services with tenant-scoped database access and RLS; critical mutations are audited transactionally; side effects go through an outbox.

- **Start here:** `docs/runbooks/local-development.md`
- **Decisions and pinned versions:** `docs/adr/ADR-001-stack-and-versions.md`
- **What is and is not built:** `docs/BACKLOG.md`

```sh
npm ci
cp .env.example .env   # fill DATABASE_URL (pooled, cgh_app) and DATABASE_URL_DIRECT (direct, owner)
npm run db:migrate && npm run db:seed
npm run dev            # http://localhost:3000 — sign in at /sign-in (dev adapter)
npm run check          # typecheck + lint + unit tests
npm run test:integration
```

## Layout
```
src/app/(storefront)   public routes        src/modules/*     business services (validation, permissions, queries, events)
src/app/(buyer)        /account, /quotes    src/db/schema     Drizzle schema · src/db/migrations reviewed SQL (incl. RLS)
src/app/(vendor)       /vendor/*            src/lib/*         auth adapter, permissions matrix, errors, API handler
src/app/(admin)        /admin/*             src/jobs          outbox handlers + dispatcher
src/app/api/v1         route handlers       tests/            unit + integration (real Postgres, runtime role, RLS on)
```

## Neon
Project `twilight-pond-28025207` (`aws-ap-southeast-1`, branch `production`). `neon.ts` declares the private `uploads` bucket; apply with `neon auth && neon deploy`. Runtime traffic uses the pooled endpoint as role `cgh_app`; migrations use the direct endpoint as the owner.
