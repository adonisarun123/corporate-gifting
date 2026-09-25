# Backlog against the specification

Status as of the first commit. "Done" means implemented with real persistence, permissions and audit; nothing in the UI is backed by fabricated data.

## Done (P0 foundation + vertical slice, spec §30/§33 steps 1–4)
- Schema, reviewed SQL migrations, constraints, EXCLUDE on price tiers, runtime role without BYPASSRLS, RLS with FORCE on vendor-scoped tables, append-only audit/security/movement tables, updated_at triggers, issued-quote immutability triggers.
- Modules: identity (dev adapter; Clerk swap point), permissions matrix, vendors (create, invite, accept, status), catalog (proposal → review → publish; public DTOs; search projection; supply summary), supply (offers, cost revisions, stock with optimistic locking, public price), carts (server-side guest/user cart, merge rules), verification (hashed e-mail codes), enquiries (idempotent submit, frozen snapshots, state machine), sourcing (scoped requests, versioned responses), quotes (draft with private costing, approve, issue with hash + supersession, one-time link, transactional acceptance), audit (transactional + redacted vendor view), outbox (leased dispatcher, per-handler idempotency, backoff, dead-letter), references (race-free).
- Storefront: home, gifts, combos, category/occasion/recipient landings, search, product/combo detail with price basis + availability wording + JSON-LD, rule-based gift finder, enquiry cart with verification and idempotent submission, thank-you, policy pages, sitemap, robots.
- Vendor portal: dashboard (live counts), proposals, inventory, pricing (cost revisions), requests + responses, activity (redacted audit), settings.
- Admin portal: dashboard (live counts), catalogue + public price, approval inbox with before/after diff and automated checks, vendors, enquiries workspace (status, notes, supplier requests, quote builder), quotes (approve/issue, private costing), reports (enquiry/quoted/accepted kept separate), audit, settings/outbox.
- `/api/v1` routes from §19 with the error contract; tests (17 unit, 15 integration); CI workflow; ADR-001.

## Not yet built (ordered roughly by §33 implementation order)
| Area | Spec | Notes |
|---|---|---|
| Clerk integration + MFA, session revocation UI | §3, §14 | adapter boundary exists (`src/lib/auth/session.ts`) |
| Media pipeline (upload intents, quarantine, scanning, AVIF/WebP derivatives, Cloudinary/S3 adapters) | §20 | media rows accept approved CDN URLs only |
| Bulk CSV import with dry-run, per-row results, formula-injection-safe exports | §20 | tables exist (`import_jobs` not yet created) |
| Vendor documents, locations, onboarding checklist, vendor-owner self-service invites | §11 | |
| Configurable combos, build-a-kit, packaging fit validation, sourcing plans | §8 (P1) | fixed combos only; `maxKitsFromStock` implemented |
| Product claims/evidence table and claim gating UI | §4 | wording check in content schema only |
| Content pages editor, redirects UI, SEO fields UI | §12, §24 | tables exist |
| Serviceability rules, tax rules UI, branding option/rate tables | §16, §18 | `tax_rules` table exists; quote GST entered per line |
| Duplicate enquiry detection, tasks/reminders, SLA config, owner assignment UI | §10, §12 | |
| Buyer organisations, shortlists, compare, sample requests, artwork proofs, PO upload, order milestones | §6, §10 (P1) | |
| Quote PDF generation | §10 | HTML document only |
| Inngest wiring, Resend adapter test, Upstash rate limiting, Sentry, PostHog allowlist | §14, §23, §26 | notification adapter falls back to logging |
| Rate limits on login/verification/search/enquiry/AI | §26 | none yet |
| Semantic search / pgvector, AI concierge and vendor assistant | §21, §22 (P1) | |
| Playwright e2e, axe accessibility run, k6 load test, restore drill | §29 | |
| Retention jobs, legal hold, deletion requests | §23, §26 | |
| Faceted-URL noindex policy beyond `?`-filtered listing pages | §24 | listing pages with filters emit `noindex` |
