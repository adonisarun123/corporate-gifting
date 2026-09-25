# Runbook — local development

## Prerequisites
Node 22, PostgreSQL 16+ (or a Neon branch), npm.

## Database
Two connection strings are required (spec §16):
- `DATABASE_URL` — pooled endpoint, runtime role `cgh_app` (created by the first migration, password from `APP_DB_PASSWORD`).
- `DATABASE_URL_DIRECT` — direct endpoint, owner role. Migrations only.

Neon: project `twilight-pond-28025207`, region `aws-ap-southeast-1`, branch `production` (PG 18). Use a **schema-only or sanitised branch** for development; never point `DATABASE_URL_DIRECT` at production from a laptop.

Local Postgres:
```sh
createuser cgh_owner -P --createrole      # password "owner"
createdb -O cgh_owner cgh_dev
cp .env.example .env                       # set DATABASE_URL_DIRECT to the owner URL, DATABASE_URL to cgh_app
npm run db:migrate                         # applies src/db/migrations, enables cgh_app login
npm run db:seed                            # synthetic vendors, buyers, products, one pending approval
npm run dev
```

Sign in at `/sign-in` (dev identity adapter) as `admin@cgh.local`, `manager@alpha.local`, `buyer1@example.local`, etc.

## Background jobs
`npm run jobs:dispatch -- --once` processes the outbox (projections, e-mails via the log adapter). Run without `--once` for a loop. Dead events appear under `/admin/settings`; replay with `replayEvent()` or SQL under the release process.

## Tests
- `npm run test:unit` — money/margin, tiers, kit availability, state machine, permission matrix, price basis.
- `npm run test:integration` — the full §30 vertical slice plus AC-04/06/07/08/11/14/15/16/17/18 against a real database with RLS. Needs `.env.test` (see `.env.example`); `npm run db:reset-local -- --test` rebuilds the test schema.

## Production deploy (Vercel + Neon)
1. Set env vars (see `.env.example`); `APP_ENV=production`, `AUTH_PROVIDER=clerk` with Clerk keys.
2. Run `npx tsx scripts/migrate.ts` from ONE controlled job with `DATABASE_URL_DIRECT` (never from app instances).
3. Deploy; hit `/api/v1/health`.
4. Run the outbox dispatcher as a worker (or port `src/jobs/handlers.ts` into Inngest functions).
