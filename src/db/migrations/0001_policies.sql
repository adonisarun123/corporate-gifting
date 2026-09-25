-- 0001_policies — reviewed SQL: extensions, constraints, runtime role, RLS, append-only audit, search projection.
-- Runs on the DIRECT connection as the owner role. Never runs at application runtime.

CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Check constraints (bounds the application also validates)
-- ---------------------------------------------------------------------------
ALTER TABLE vendor_offers
  ADD CONSTRAINT vendor_offers_moq_positive CHECK (moq > 0),
  ADD CONSTRAINT vendor_offers_increment_positive CHECK (quantity_increment > 0),
  ADD CONSTRAINT vendor_offers_lead_time_range CHECK (lead_time_days_min >= 0 AND lead_time_days_max >= lead_time_days_min);--> statement-breakpoint
ALTER TABLE offer_price_tiers
  ADD CONSTRAINT offer_price_tiers_min_positive CHECK (min_quantity > 0),
  ADD CONSTRAINT offer_price_tiers_range CHECK (max_quantity IS NULL OR max_quantity >= min_quantity),
  ADD CONSTRAINT offer_price_tiers_cost_nonneg CHECK (unit_cost_minor >= 0);--> statement-breakpoint
-- No overlapping tiers within one offer revision. int4range upper bound is exclusive, so max+1; NULL = unbounded.
ALTER TABLE offer_price_tiers
  ADD CONSTRAINT offer_price_tiers_no_overlap EXCLUDE USING gist (
    offer_revision_id WITH =,
    int4range(min_quantity, COALESCE(max_quantity + 1, 2147483647), '[)') WITH &&
  );--> statement-breakpoint
ALTER TABLE inventory_balances
  ADD CONSTRAINT inventory_balances_nonneg CHECK (on_hand >= 0 AND reserved >= 0 AND safety_stock >= 0);--> statement-breakpoint
ALTER TABLE cart_items ADD CONSTRAINT cart_items_quantity_positive CHECK (quantity > 0);--> statement-breakpoint
ALTER TABLE enquiry_items ADD CONSTRAINT enquiry_items_quantity_positive CHECK (quantity > 0);--> statement-breakpoint
ALTER TABLE enquiries ADD CONSTRAINT enquiries_recipient_count_positive CHECK (recipient_count > 0);--> statement-breakpoint
ALTER TABLE supplier_request_items ADD CONSTRAINT supplier_request_items_quantity_positive CHECK (quantity > 0);--> statement-breakpoint
ALTER TABLE supplier_response_items
  ADD CONSTRAINT supplier_response_items_cost_nonneg CHECK (unit_cost_minor >= 0 AND setup_charge_minor >= 0 AND branding_unit_cost_minor >= 0),
  ADD CONSTRAINT supplier_response_items_lead_time_range CHECK (lead_time_days_min >= 0 AND lead_time_days_max >= lead_time_days_min);--> statement-breakpoint
ALTER TABLE quote_items
  ADD CONSTRAINT quote_items_quantity_positive CHECK (quantity > 0),
  ADD CONSTRAINT quote_items_money_nonneg CHECK (unit_price_minor >= 0 AND tax_minor >= 0 AND line_total_minor >= 0),
  ADD CONSTRAINT quote_items_tax_rate_bounds CHECK (tax_rate_bp >= 0 AND tax_rate_bp <= 10000);--> statement-breakpoint
ALTER TABLE quote_revisions
  ADD CONSTRAINT quote_revisions_money_nonneg CHECK (subtotal_minor >= 0 AND charges_minor >= 0 AND discount_minor >= 0 AND tax_minor >= 0 AND total_minor >= 0);--> statement-breakpoint
ALTER TABLE public_price_entries
  ADD CONSTRAINT public_price_entries_mode_price CHECK (
    (mode = 'request_quote' AND unit_price_minor IS NULL) OR (mode <> 'request_quote' AND unit_price_minor IS NOT NULL AND unit_price_minor > 0)
  );--> statement-breakpoint
ALTER TABLE combo_components ADD CONSTRAINT combo_components_units_positive CHECK (units_per_kit > 0);--> statement-breakpoint
ALTER TABLE tax_rules ADD CONSTRAINT tax_rules_rate_bounds CHECK (rate_bp >= 0 AND rate_bp <= 10000);--> statement-breakpoint

-- Vendor scope must agree between parent and child rows (spec §16: no mixing vendor IDs).
ALTER TABLE vendor_offers ADD CONSTRAINT vendor_offers_id_vendor_uq UNIQUE (id, vendor_id);--> statement-breakpoint
ALTER TABLE vendor_offer_revisions
  ADD CONSTRAINT vendor_offer_revisions_offer_vendor_fk FOREIGN KEY (offer_id, vendor_id) REFERENCES vendor_offers (id, vendor_id),
  ADD CONSTRAINT vendor_offer_revisions_id_vendor_uq UNIQUE (id, vendor_id);--> statement-breakpoint
ALTER TABLE offer_price_tiers
  ADD CONSTRAINT offer_price_tiers_revision_vendor_fk FOREIGN KEY (offer_revision_id, vendor_id) REFERENCES vendor_offer_revisions (id, vendor_id);--> statement-breakpoint
ALTER TABLE inventory_balances
  ADD CONSTRAINT inventory_balances_offer_vendor_fk FOREIGN KEY (offer_id, vendor_id) REFERENCES vendor_offers (id, vendor_id);--> statement-breakpoint
ALTER TABLE inventory_movements
  ADD CONSTRAINT inventory_movements_offer_vendor_fk FOREIGN KEY (offer_id, vendor_id) REFERENCES vendor_offers (id, vendor_id);--> statement-breakpoint
ALTER TABLE supplier_requests ADD CONSTRAINT supplier_requests_id_vendor_uq UNIQUE (id, vendor_id);--> statement-breakpoint
ALTER TABLE supplier_request_items
  ADD CONSTRAINT supplier_request_items_request_vendor_fk FOREIGN KEY (request_id, vendor_id) REFERENCES supplier_requests (id, vendor_id),
  ADD CONSTRAINT supplier_request_items_id_vendor_uq UNIQUE (id, vendor_id);--> statement-breakpoint
ALTER TABLE supplier_responses
  ADD CONSTRAINT supplier_responses_request_vendor_fk FOREIGN KEY (request_id, vendor_id) REFERENCES supplier_requests (id, vendor_id),
  ADD CONSTRAINT supplier_responses_id_vendor_uq UNIQUE (id, vendor_id);--> statement-breakpoint
ALTER TABLE supplier_response_items
  ADD CONSTRAINT supplier_response_items_response_vendor_fk FOREIGN KEY (response_id, vendor_id) REFERENCES supplier_responses (id, vendor_id),
  ADD CONSTRAINT supplier_response_items_request_item_vendor_fk FOREIGN KEY (request_item_id, vendor_id) REFERENCES supplier_request_items (id, vendor_id);--> statement-breakpoint

-- Products: pointer FKs added after both tables exist.
ALTER TABLE products ADD CONSTRAINT products_current_revision_fk FOREIGN KEY (current_revision_id) REFERENCES product_revisions (id);--> statement-breakpoint
ALTER TABLE vendor_offers ADD CONSTRAINT vendor_offers_current_revision_fk FOREIGN KEY (current_revision_id) REFERENCES vendor_offer_revisions (id);--> statement-breakpoint
ALTER TABLE quotes ADD CONSTRAINT quotes_current_revision_fk FOREIGN KEY (current_revision_id) REFERENCES quote_revisions (id);--> statement-breakpoint
ALTER TABLE quote_revisions ADD CONSTRAINT quote_revisions_superseded_by_fk FOREIGN KEY (superseded_by_revision_id) REFERENCES quote_revisions (id);--> statement-breakpoint
ALTER TABLE categories ADD CONSTRAINT categories_parent_fk FOREIGN KEY (parent_id) REFERENCES categories (id);--> statement-breakpoint

-- One published (current) combo revision per combo.
CREATE UNIQUE INDEX combo_revisions_current_uq ON combo_revisions (combo_product_id) WHERE is_current;--> statement-breakpoint
-- Trigram indexes for admin/global search on names and codes.
CREATE INDEX products_public_code_trgm ON products USING gin (public_code gin_trgm_ops);--> statement-breakpoint
CREATE INDEX product_variants_sku_trgm ON product_variants USING gin (sku gin_trgm_ops);--> statement-breakpoint
CREATE INDEX vendor_offers_supplier_sku_trgm ON vendor_offers USING gin (supplier_sku gin_trgm_ops);--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Published search projection (public fields only; refreshed by outbox handler)
-- ---------------------------------------------------------------------------
CREATE TABLE product_search_documents (
  product_id uuid PRIMARY KEY REFERENCES products (id),
  public_code text NOT NULL,
  name text NOT NULL,
  document tsvector NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX product_search_documents_gin ON product_search_documents USING gin (document);--> statement-breakpoint
CREATE INDEX product_search_documents_name_trgm ON product_search_documents USING gin (name gin_trgm_ops);--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Context helpers: transaction-local, set only by trusted server code.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_actor_kind() RETURNS text
  LANGUAGE sql STABLE PARALLEL SAFE AS
  $$ SELECT COALESCE(NULLIF(current_setting('app.actor_kind', true), ''), 'none') $$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_vendor_id() RETURNS uuid
  LANGUAGE sql STABLE PARALLEL SAFE AS
  $$ SELECT NULLIF(current_setting('app.vendor_id', true), '')::uuid $$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_actor_id() RETURNS uuid
  LANGUAGE sql STABLE PARALLEL SAFE AS
  $$ SELECT NULLIF(current_setting('app.actor_id', true), '')::uuid $$;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Append-only protection
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION forbid_row_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'table % is append-only', TG_TABLE_NAME USING ERRCODE = 'insufficient_privilege';
END $$;--> statement-breakpoint
CREATE TRIGGER audit_events_append_only BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION forbid_row_change();--> statement-breakpoint
CREATE TRIGGER security_events_append_only BEFORE UPDATE OR DELETE ON security_events FOR EACH ROW EXECUTE FUNCTION forbid_row_change();--> statement-breakpoint
CREATE TRIGGER inventory_movements_append_only BEFORE UPDATE OR DELETE ON inventory_movements FOR EACH ROW EXECUTE FUNCTION forbid_row_change();--> statement-breakpoint
CREATE TRIGGER enquiry_items_append_only BEFORE UPDATE OR DELETE ON enquiry_items FOR EACH ROW EXECUTE FUNCTION forbid_row_change();--> statement-breakpoint
CREATE TRIGGER enquiry_history_append_only BEFORE UPDATE OR DELETE ON enquiry_history FOR EACH ROW EXECUTE FUNCTION forbid_row_change();--> statement-breakpoint
CREATE TRIGGER quote_acceptances_append_only BEFORE UPDATE OR DELETE ON quote_acceptances FOR EACH ROW EXECUTE FUNCTION forbid_row_change();--> statement-breakpoint
CREATE TRIGGER quote_revision_costings_append_only BEFORE UPDATE OR DELETE ON quote_revision_costings FOR EACH ROW EXECUTE FUNCTION forbid_row_change();--> statement-breakpoint

-- Issued quote revisions are immutable except for status transitions on the workflow columns.
CREATE OR REPLACE FUNCTION guard_issued_quote_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.issued_at IS NOT NULL THEN
    IF NEW.customer_document IS DISTINCT FROM OLD.customer_document
       OR NEW.document_hash IS DISTINCT FROM OLD.document_hash
       OR NEW.total_minor IS DISTINCT FROM OLD.total_minor
       OR NEW.subtotal_minor IS DISTINCT FROM OLD.subtotal_minor
       OR NEW.tax_minor IS DISTINCT FROM OLD.tax_minor
       OR NEW.charges_minor IS DISTINCT FROM OLD.charges_minor
       OR NEW.discount_minor IS DISTINCT FROM OLD.discount_minor
       OR NEW.terms IS DISTINCT FROM OLD.terms
       OR NEW.valid_until IS DISTINCT FROM OLD.valid_until
       OR NEW.issued_at IS DISTINCT FROM OLD.issued_at
       OR NEW.revision_no IS DISTINCT FROM OLD.revision_no THEN
      RAISE EXCEPTION 'issued quote revision % is immutable; create a new revision', OLD.id USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER quote_revisions_immutable_after_issue BEFORE UPDATE ON quote_revisions FOR EACH ROW EXECUTE FUNCTION guard_issued_quote_revision();--> statement-breakpoint
CREATE OR REPLACE FUNCTION forbid_quote_item_change_after_issue() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE issued timestamptz;
BEGIN
  SELECT issued_at INTO issued FROM quote_revisions WHERE id = COALESCE(NEW.revision_id, OLD.revision_id);
  IF issued IS NOT NULL THEN
    RAISE EXCEPTION 'quote items of an issued revision are immutable' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;--> statement-breakpoint
CREATE TRIGGER quote_items_immutable_after_issue BEFORE INSERT OR UPDATE OR DELETE ON quote_items FOR EACH ROW EXECUTE FUNCTION forbid_quote_item_change_after_issue();--> statement-breakpoint

-- updated_at maintenance
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;--> statement-breakpoint
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.columns
           WHERE table_schema = 'public' AND column_name = 'updated_at'
  LOOP
    EXECUTE format('CREATE TRIGGER %I_set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Runtime role: non-owner, no BYPASSRLS. Password is set by scripts/migrate.ts from APP_DB_PASSWORD.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cgh_app') THEN
    CREATE ROLE cgh_app NOLOGIN NOBYPASSRLS NOINHERIT;
  END IF;
END $$;--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO cgh_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cgh_app;--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cgh_app;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cgh_app;--> statement-breakpoint
-- Append-only tables: the runtime role cannot update or delete even if a trigger were dropped.
REVOKE UPDATE, DELETE ON audit_events, security_events, inventory_movements, enquiry_items, enquiry_history, quote_acceptances, quote_revision_costings FROM cgh_app;--> statement-breakpoint
-- Migration bookkeeping is owner-only.
REVOKE ALL ON SCHEMA drizzle FROM cgh_app;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Row-level security (defence in depth; services scope every query explicitly).
-- Default deny: a row is visible only if some policy grants it.
-- ---------------------------------------------------------------------------
-- Vendor-owned tables: platform/system see all; a vendor sees its own vendor_id only.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'vendor_offers','vendor_offer_revisions','offer_price_tiers','inventory_balances','inventory_movements',
    'vendor_invitations','supplier_requests','supplier_request_items','supplier_responses','supplier_response_items'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY %I_platform ON %I FOR ALL
      USING (app_actor_kind() IN ('platform','system'))
      WITH CHECK (app_actor_kind() IN ('platform','system'))$p$, t, t);
    EXECUTE format($p$CREATE POLICY %I_vendor ON %I FOR ALL
      USING (app_actor_kind() = 'vendor' AND vendor_id = app_vendor_id())
      WITH CHECK (app_actor_kind() = 'vendor' AND vendor_id = app_vendor_id())$p$, t, t);
  END LOOP;
END $$;--> statement-breakpoint

-- Vendor memberships: platform/system all; vendor context sees rows of its own vendor; a user sees their own rows.
ALTER TABLE vendor_memberships ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE vendor_memberships FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY vendor_memberships_platform ON vendor_memberships FOR ALL
  USING (app_actor_kind() IN ('platform','system')) WITH CHECK (app_actor_kind() IN ('platform','system'));--> statement-breakpoint
CREATE POLICY vendor_memberships_vendor ON vendor_memberships FOR SELECT
  USING (app_actor_kind() = 'vendor' AND vendor_id = app_vendor_id());--> statement-breakpoint
CREATE POLICY vendor_memberships_self ON vendor_memberships FOR SELECT
  USING (user_id = app_actor_id());--> statement-breakpoint

-- Product revisions: approved content is public; drafts visible to platform and to the proposing vendor.
ALTER TABLE product_revisions ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE product_revisions FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY product_revisions_platform ON product_revisions FOR ALL
  USING (app_actor_kind() IN ('platform','system')) WITH CHECK (app_actor_kind() IN ('platform','system'));--> statement-breakpoint
CREATE POLICY product_revisions_public_read ON product_revisions FOR SELECT
  USING (review_status = 'approved');--> statement-breakpoint
CREATE POLICY product_revisions_vendor ON product_revisions FOR ALL
  USING (app_actor_kind() = 'vendor' AND author_vendor_id = app_vendor_id())
  WITH CHECK (app_actor_kind() = 'vendor' AND author_vendor_id = app_vendor_id());--> statement-breakpoint

-- Private costings: platform only.
ALTER TABLE quote_revision_costings ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE quote_revision_costings FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY quote_revision_costings_platform ON quote_revision_costings FOR ALL
  USING (app_actor_kind() IN ('platform','system')) WITH CHECK (app_actor_kind() IN ('platform','system'));--> statement-breakpoint

-- Audit: anyone may append; platform/system read all; a vendor reads its own scope (services redact fields).
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY audit_events_insert ON audit_events FOR INSERT WITH CHECK (true);--> statement-breakpoint
CREATE POLICY audit_events_platform_read ON audit_events FOR SELECT USING (app_actor_kind() IN ('platform','system'));--> statement-breakpoint
CREATE POLICY audit_events_vendor_read ON audit_events FOR SELECT USING (app_actor_kind() = 'vendor' AND vendor_scope_id = app_vendor_id());--> statement-breakpoint
CREATE POLICY audit_events_self_read ON audit_events FOR SELECT USING (actor_id IS NOT NULL AND actor_id = app_actor_id());--> statement-breakpoint

-- Seed the reference counters used by allocateReference().
INSERT INTO reference_counters (kind, period, next_value) VALUES
  ('vendor', 'all', 1), ('product', 'all', 1), ('combo', 'all', 1)
ON CONFLICT DO NOTHING;
