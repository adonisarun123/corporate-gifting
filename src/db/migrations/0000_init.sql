CREATE TYPE "public"."actor_kind" AS ENUM('visitor', 'buyer', 'vendor', 'platform', 'system');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('INR');--> statement-breakpoint
CREATE TYPE "public"."platform_role" AS ENUM('owner', 'admin', 'sales', 'catalog_editor');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."vendor_membership_role" AS ENUM('manager', 'owner');--> statement-breakpoint
CREATE TYPE "public"."vendor_membership_status" AS ENUM('active', 'suspended', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."vendor_status" AS ENUM('applied', 'verifying', 'active', 'paused', 'suspended', 'archived');--> statement-breakpoint
CREATE TYPE "public"."product_kind" AS ENUM('product', 'combo');--> statement-breakpoint
CREATE TYPE "public"."product_lifecycle" AS ENUM('draft', 'published', 'paused', 'archived');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('draft', 'submitted', 'approved', 'rejected', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."taxonomy_kind" AS ENUM('recipient', 'occasion', 'material', 'use_case', 'budget_band');--> statement-breakpoint
CREATE TYPE "public"."variant_status" AS ENUM('active', 'discontinued');--> statement-breakpoint
CREATE TYPE "public"."inventory_movement_kind" AS ENUM('receipt', 'issue', 'damage', 'return', 'reconciliation', 'import');--> statement-breakpoint
CREATE TYPE "public"."offer_status" AS ENUM('draft', 'active', 'paused', 'archived');--> statement-breakpoint
CREATE TYPE "public"."supply_mode" AS ENUM('ready_stock', 'made_to_order', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."cart_status" AS ENUM('active', 'submitted', 'expired', 'merged');--> statement-breakpoint
CREATE TYPE "public"."enquiry_closed_reason" AS ENUM('spam', 'duplicate', 'no_response', 'cancelled', 'lost_to_competitor', 'budget_mismatch', 'unavailable_requirement');--> statement-breakpoint
CREATE TYPE "public"."enquiry_status" AS ENUM('submitted', 'qualified', 'sourcing', 'quoted', 'accepted', 'order_confirmed', 'closed');--> statement-breakpoint
CREATE TYPE "public"."quote_revision_status" AS ENUM('draft', 'approved', 'issued', 'viewed', 'revision_requested', 'accepted', 'rejected', 'expired', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."supplier_request_status" AS ENUM('draft', 'sent', 'responded', 'declined', 'expired', 'closed');--> statement-breakpoint
CREATE TYPE "public"."outbox_status" AS ENUM('pending', 'processing', 'done', 'failed', 'dead');--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"notice_version" text NOT NULL,
	"granted" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"company_name" text NOT NULL,
	"designation" text,
	"verified_channel" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_platform_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "platform_role" NOT NULL,
	"granted_by" uuid,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_subject" text NOT NULL,
	"display_name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified_at" timestamp with time zone,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "vendor_membership_role" DEFAULT 'manager' NOT NULL,
	"token_hash" text NOT NULL,
	"invited_by" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "vendor_membership_role" DEFAULT 'manager' NOT NULL,
	"status" "vendor_membership_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_code" text NOT NULL,
	"legal_name" text NOT NULL,
	"display_name" text NOT NULL,
	"status" "vendor_status" DEFAULT 'applied' NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text,
	"service_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"serviceable_regions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"parent_id" uuid,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "combo_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"combo_revision_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"units_per_kit" integer DEFAULT 1 NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "combo_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"combo_product_id" uuid NOT NULL,
	"revision_no" integer NOT NULL,
	"combo_type" text DEFAULT 'fixed' NOT NULL,
	"packaging" jsonb,
	"assembly_mode" text DEFAULT 'assembled' NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"product_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "product_categories_product_id_category_id_pk" PRIMARY KEY("product_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "product_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"url" text NOT NULL,
	"alt_text" text NOT NULL,
	"width" integer,
	"height" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_hero" boolean DEFAULT false NOT NULL,
	"approved" boolean DEFAULT false NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"revision_no" integer NOT NULL,
	"content" jsonb NOT NULL,
	"review_status" "review_status" DEFAULT 'draft' NOT NULL,
	"author_user_id" uuid NOT NULL,
	"author_vendor_id" uuid,
	"submitted_at" timestamp with time zone,
	"reviewer_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"review_reason" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_supply_summaries" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"min_moq" integer,
	"lead_time_days_min" integer,
	"lead_time_days_max" integer,
	"stock_state" text DEFAULT 'unknown' NOT NULL,
	"active_offer_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_terms" (
	"product_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	CONSTRAINT "product_terms_product_id_term_id_pk" PRIMARY KEY("product_id","term_id")
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"label" text NOT NULL,
	"options" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "variant_status" DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_code" text NOT NULL,
	"kind" "product_kind" DEFAULT 'product' NOT NULL,
	"slug" text NOT NULL,
	"lifecycle" "product_lifecycle" DEFAULT 'draft' NOT NULL,
	"primary_category_id" uuid,
	"current_revision_id" uuid,
	"proposed_by_vendor_id" uuid,
	"published_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slug_redirects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_path" text NOT NULL,
	"to_path" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taxonomy_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "taxonomy_kind" NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"on_hand" integer DEFAULT 0 NOT NULL,
	"reserved" integer DEFAULT 0 NOT NULL,
	"safety_stock" integer DEFAULT 0 NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"kind" "inventory_movement_kind" NOT NULL,
	"delta" integer NOT NULL,
	"resulting_on_hand" integer NOT NULL,
	"reason" text,
	"reference" text,
	"actor_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offer_price_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_revision_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"min_quantity" integer NOT NULL,
	"max_quantity" integer,
	"unit_cost_minor" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "public_price_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"mode" text DEFAULT 'request_quote' NOT NULL,
	"min_quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_minor" bigint,
	"currency" "currency" DEFAULT 'INR' NOT NULL,
	"includes_tax" boolean DEFAULT false NOT NULL,
	"includes_branding" boolean DEFAULT false NOT NULL,
	"includes_shipping" boolean DEFAULT false NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_until" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid,
	"category_id" uuid,
	"label" text NOT NULL,
	"rate_bp" integer NOT NULL,
	"jurisdiction" text DEFAULT 'IN' NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_until" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "vendor_offer_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"revision_no" integer NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_until" timestamp with time zone,
	"setup_charge_minor" bigint DEFAULT 0 NOT NULL,
	"setup_charge_scope" text DEFAULT 'per_order' NOT NULL,
	"tax_treatment" text DEFAULT 'exclusive' NOT NULL,
	"notes" text,
	"author_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"supplier_sku" text NOT NULL,
	"status" "offer_status" DEFAULT 'draft' NOT NULL,
	"moq" integer NOT NULL,
	"quantity_increment" integer DEFAULT 1 NOT NULL,
	"supply_mode" "supply_mode" DEFAULT 'ready_stock' NOT NULL,
	"currency" "currency" DEFAULT 'INR' NOT NULL,
	"lead_time_days_min" integer NOT NULL,
	"lead_time_days_max" integer NOT NULL,
	"branding_capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"current_revision_id" uuid,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"quantity" integer NOT NULL,
	"unit" text DEFAULT 'item' NOT NULL,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"estimate" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid,
	"guest_token_hash" text,
	"status" "cart_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"contact_id" uuid NOT NULL,
	"buyer_user_id" uuid,
	"cart_id" uuid,
	"status" "enquiry_status" DEFAULT 'submitted' NOT NULL,
	"closed_reason" "enquiry_closed_reason",
	"owner_user_id" uuid,
	"priority" text DEFAULT 'normal' NOT NULL,
	"due_at" timestamp with time zone,
	"occasion" text,
	"recipient_count" integer NOT NULL,
	"budget" jsonb,
	"destination" jsonb NOT NULL,
	"requested_delivery_date" date,
	"date_is_flexible" boolean DEFAULT false NOT NULL,
	"branding_needs" text,
	"notes" text,
	"source" text DEFAULT 'web' NOT NULL,
	"processing_notice_version" text NOT NULL,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enquiry_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enquiry_id" uuid NOT NULL,
	"from_status" "enquiry_status",
	"to_status" "enquiry_status" NOT NULL,
	"reason" text,
	"actor_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enquiry_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enquiry_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"quantity" integer NOT NULL,
	"unit" text DEFAULT 'item' NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enquiry_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enquiry_id" uuid NOT NULL,
	"visibility" text DEFAULT 'internal' NOT NULL,
	"body" text NOT NULL,
	"author_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_acceptances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"accepted_by_user_id" uuid,
	"accepted_by_contact_id" uuid,
	"verification_method" text NOT NULL,
	"document_hash" text NOT NULL,
	"terms_version" text NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_access_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"enquiry_item_id" uuid,
	"public_code" text NOT NULL,
	"description" text NOT NULL,
	"variant_label" text,
	"quantity" integer NOT NULL,
	"unit" text DEFAULT 'item' NOT NULL,
	"unit_price_minor" bigint NOT NULL,
	"tax_rate_bp" integer DEFAULT 0 NOT NULL,
	"tax_minor" bigint DEFAULT 0 NOT NULL,
	"line_total_minor" bigint NOT NULL,
	"inclusions" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_revision_costings" (
	"revision_id" uuid PRIMARY KEY NOT NULL,
	"costing" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"revision_no" integer NOT NULL,
	"status" "quote_revision_status" DEFAULT 'draft' NOT NULL,
	"currency" "currency" DEFAULT 'INR' NOT NULL,
	"subtotal_minor" bigint DEFAULT 0 NOT NULL,
	"charges_minor" bigint DEFAULT 0 NOT NULL,
	"discount_minor" bigint DEFAULT 0 NOT NULL,
	"tax_minor" bigint DEFAULT 0 NOT NULL,
	"total_minor" bigint DEFAULT 0 NOT NULL,
	"valid_until" timestamp with time zone,
	"terms" jsonb,
	"customer_document" jsonb,
	"document_hash" text,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"issued_by" uuid,
	"issued_at" timestamp with time zone,
	"superseded_by_revision_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enquiry_id" uuid NOT NULL,
	"quote_number" text NOT NULL,
	"current_revision_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_request_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"enquiry_item_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"branding_spec" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"requirements" text
);
--> statement-breakpoint
CREATE TABLE "supplier_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enquiry_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"status" "supplier_request_status" DEFAULT 'draft' NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"delivery_region" text NOT NULL,
	"needed_by_date" date,
	"message" text,
	"released_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" uuid,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_response_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"response_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"request_item_id" uuid NOT NULL,
	"unit_cost_minor" bigint NOT NULL,
	"setup_charge_minor" bigint DEFAULT 0 NOT NULL,
	"branding_unit_cost_minor" bigint DEFAULT 0 NOT NULL,
	"tax_treatment" text DEFAULT 'exclusive' NOT NULL,
	"ready_quantity" integer DEFAULT 0 NOT NULL,
	"production_capacity" integer,
	"lead_time_days_min" integer NOT NULL,
	"lead_time_days_max" integer NOT NULL,
	"dispatch_date" date,
	"substitution_note" text
);
--> statement-breakpoint
CREATE TABLE "supplier_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"version_no" integer NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"valid_until" timestamp with time zone,
	"freight_assumptions" text,
	"packaging_assembly_minor" bigint DEFAULT 0 NOT NULL,
	"notes" text,
	"submitted_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_kind" "actor_kind" NOT NULL,
	"actor_id" uuid,
	"effective_role" text,
	"vendor_scope_id" uuid,
	"customer_scope_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"entity_version" integer,
	"before" jsonb,
	"after" jsonb,
	"reason" text,
	"request_id" text,
	"correlation_id" text,
	"source" text DEFAULT 'web' NOT NULL,
	"outcome" text DEFAULT 'success' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"kind" text DEFAULT 'page' NOT NULL,
	"body" text NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"noindex" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"author_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"key" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" text NOT NULL,
	"key" text NOT NULL,
	"request_hash" text NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"response_code" integer,
	"response_body" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"outbox_event_id" uuid,
	"channel" text NOT NULL,
	"template" text NOT NULL,
	"recipient_masked" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"provider_message_id" text,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "outbox_status" DEFAULT 'pending' NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 8 NOT NULL,
	"lease_until" timestamp with time zone,
	"lease_owner" text,
	"last_error" text,
	"correlation_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "processed_events" (
	"event_id" uuid NOT NULL,
	"handler" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "processed_events_event_id_handler_pk" PRIMARY KEY("event_id","handler")
);
--> statement-breakpoint
CREATE TABLE "reference_counters" (
	"kind" text NOT NULL,
	"period" text NOT NULL,
	"next_value" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "reference_counters_kind_period_pk" PRIMARY KEY("kind","period")
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_kind" "actor_kind" NOT NULL,
	"actor_id" uuid,
	"event" text NOT NULL,
	"outcome" text NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"request_id" text,
	"ip_hash" text,
	"user_agent" text,
	"detail" jsonb
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_platform_roles" ADD CONSTRAINT "user_platform_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_platform_roles" ADD CONSTRAINT "user_platform_roles_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_invitations" ADD CONSTRAINT "vendor_invitations_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_invitations" ADD CONSTRAINT "vendor_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_memberships" ADD CONSTRAINT "vendor_memberships_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_memberships" ADD CONSTRAINT "vendor_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combo_components" ADD CONSTRAINT "combo_components_combo_revision_id_combo_revisions_id_fk" FOREIGN KEY ("combo_revision_id") REFERENCES "public"."combo_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combo_components" ADD CONSTRAINT "combo_components_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combo_revisions" ADD CONSTRAINT "combo_revisions_combo_product_id_products_id_fk" FOREIGN KEY ("combo_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combo_revisions" ADD CONSTRAINT "combo_revisions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_revisions" ADD CONSTRAINT "product_revisions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_revisions" ADD CONSTRAINT "product_revisions_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_revisions" ADD CONSTRAINT "product_revisions_author_vendor_id_vendors_id_fk" FOREIGN KEY ("author_vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_revisions" ADD CONSTRAINT "product_revisions_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_supply_summaries" ADD CONSTRAINT "product_supply_summaries_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_terms" ADD CONSTRAINT "product_terms_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_terms" ADD CONSTRAINT "product_terms_term_id_taxonomy_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."taxonomy_terms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_primary_category_id_categories_id_fk" FOREIGN KEY ("primary_category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_proposed_by_vendor_id_vendors_id_fk" FOREIGN KEY ("proposed_by_vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_offer_id_vendor_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."vendor_offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_offer_id_vendor_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."vendor_offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_price_tiers" ADD CONSTRAINT "offer_price_tiers_offer_revision_id_vendor_offer_revisions_id_fk" FOREIGN KEY ("offer_revision_id") REFERENCES "public"."vendor_offer_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_price_tiers" ADD CONSTRAINT "offer_price_tiers_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_price_entries" ADD CONSTRAINT "public_price_entries_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_price_entries" ADD CONSTRAINT "public_price_entries_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_price_entries" ADD CONSTRAINT "public_price_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_offer_revisions" ADD CONSTRAINT "vendor_offer_revisions_offer_id_vendor_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."vendor_offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_offer_revisions" ADD CONSTRAINT "vendor_offer_revisions_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_offer_revisions" ADD CONSTRAINT "vendor_offer_revisions_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_offers" ADD CONSTRAINT "vendor_offers_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_offers" ADD CONSTRAINT "vendor_offers_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_offers" ADD CONSTRAINT "vendor_offers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_offers" ADD CONSTRAINT "vendor_offers_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_buyer_user_id_users_id_fk" FOREIGN KEY ("buyer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiry_history" ADD CONSTRAINT "enquiry_history_enquiry_id_enquiries_id_fk" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiry_history" ADD CONSTRAINT "enquiry_history_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiry_items" ADD CONSTRAINT "enquiry_items_enquiry_id_enquiries_id_fk" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiry_items" ADD CONSTRAINT "enquiry_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiry_items" ADD CONSTRAINT "enquiry_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiry_notes" ADD CONSTRAINT "enquiry_notes_enquiry_id_enquiries_id_fk" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiry_notes" ADD CONSTRAINT "enquiry_notes_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_acceptances" ADD CONSTRAINT "quote_acceptances_revision_id_quote_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."quote_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_acceptances" ADD CONSTRAINT "quote_acceptances_accepted_by_user_id_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_acceptances" ADD CONSTRAINT "quote_acceptances_accepted_by_contact_id_contacts_id_fk" FOREIGN KEY ("accepted_by_contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_access_tokens" ADD CONSTRAINT "quote_access_tokens_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_access_tokens" ADD CONSTRAINT "quote_access_tokens_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_revision_id_quote_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."quote_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_enquiry_item_id_enquiry_items_id_fk" FOREIGN KEY ("enquiry_item_id") REFERENCES "public"."enquiry_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_revision_costings" ADD CONSTRAINT "quote_revision_costings_revision_id_quote_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."quote_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_revisions" ADD CONSTRAINT "quote_revisions_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_revisions" ADD CONSTRAINT "quote_revisions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_revisions" ADD CONSTRAINT "quote_revisions_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_revisions" ADD CONSTRAINT "quote_revisions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_enquiry_id_enquiries_id_fk" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_request_items" ADD CONSTRAINT "supplier_request_items_request_id_supplier_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."supplier_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_request_items" ADD CONSTRAINT "supplier_request_items_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_request_items" ADD CONSTRAINT "supplier_request_items_enquiry_item_id_enquiry_items_id_fk" FOREIGN KEY ("enquiry_item_id") REFERENCES "public"."enquiry_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_request_items" ADD CONSTRAINT "supplier_request_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_requests" ADD CONSTRAINT "supplier_requests_enquiry_id_enquiries_id_fk" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_requests" ADD CONSTRAINT "supplier_requests_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_requests" ADD CONSTRAINT "supplier_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_response_items" ADD CONSTRAINT "supplier_response_items_response_id_supplier_responses_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."supplier_responses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_response_items" ADD CONSTRAINT "supplier_response_items_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_response_items" ADD CONSTRAINT "supplier_response_items_request_item_id_supplier_request_items_id_fk" FOREIGN KEY ("request_item_id") REFERENCES "public"."supplier_request_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_responses" ADD CONSTRAINT "supplier_responses_request_id_supplier_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."supplier_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_responses" ADD CONSTRAINT "supplier_responses_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_responses" ADD CONSTRAINT "supplier_responses_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contacts_email_idx" ON "contacts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "contacts_user_idx" ON "contacts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_platform_roles_user_idx" ON "user_platform_roles" USING btree ("user_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "users_auth_subject_uq" ON "users" USING btree ("auth_subject");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_invitations_token_uq" ON "vendor_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "vendor_invitations_vendor_idx" ON "vendor_invitations" USING btree ("vendor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_memberships_uq" ON "vendor_memberships" USING btree ("vendor_id","user_id");--> statement-breakpoint
CREATE INDEX "vendor_memberships_user_idx" ON "vendor_memberships" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "vendors_code_uq" ON "vendors" USING btree ("vendor_code");--> statement-breakpoint
CREATE INDEX "vendors_status_idx" ON "vendors" USING btree ("status","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_uq" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "combo_components_revision_idx" ON "combo_components" USING btree ("combo_revision_id");--> statement-breakpoint
CREATE UNIQUE INDEX "combo_revisions_no_uq" ON "combo_revisions" USING btree ("combo_product_id","revision_no");--> statement-breakpoint
CREATE INDEX "product_media_product_idx" ON "product_media" USING btree ("product_id","approved","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "product_revisions_no_uq" ON "product_revisions" USING btree ("product_id","revision_no");--> statement-breakpoint
CREATE INDEX "product_revisions_status_idx" ON "product_revisions" USING btree ("review_status","submitted_at");--> statement-breakpoint
CREATE INDEX "product_terms_term_idx" ON "product_terms" USING btree ("term_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_sku_uq" ON "product_variants" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "product_variants_product_idx" ON "product_variants" USING btree ("product_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "products_public_code_uq" ON "products" USING btree ("public_code");--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_uq" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "products_lifecycle_idx" ON "products" USING btree ("lifecycle","updated_at");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("primary_category_id","lifecycle");--> statement-breakpoint
CREATE UNIQUE INDEX "slug_redirects_from_uq" ON "slug_redirects" USING btree ("from_path");--> statement-breakpoint
CREATE UNIQUE INDEX "taxonomy_terms_kind_slug_uq" ON "taxonomy_terms" USING btree ("kind","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_balances_offer_uq" ON "inventory_balances" USING btree ("offer_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_offer_idx" ON "inventory_movements" USING btree ("offer_id","created_at");--> statement-breakpoint
CREATE INDEX "offer_price_tiers_revision_idx" ON "offer_price_tiers" USING btree ("offer_revision_id","min_quantity");--> statement-breakpoint
CREATE INDEX "public_price_entries_product_idx" ON "public_price_entries" USING btree ("product_id","effective_from");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_offer_revisions_no_uq" ON "vendor_offer_revisions" USING btree ("offer_id","revision_no");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_offers_sku_uq" ON "vendor_offers" USING btree ("vendor_id","supplier_sku");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_offers_variant_uq" ON "vendor_offers" USING btree ("vendor_id","variant_id");--> statement-breakpoint
CREATE INDEX "vendor_offers_vendor_status_idx" ON "vendor_offers" USING btree ("vendor_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "vendor_offers_variant_idx" ON "vendor_offers" USING btree ("variant_id","status");--> statement-breakpoint
CREATE INDEX "cart_items_cart_idx" ON "cart_items" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "carts_owner_idx" ON "carts" USING btree ("owner_user_id","status");--> statement-breakpoint
CREATE INDEX "carts_guest_idx" ON "carts" USING btree ("guest_token_hash","status");--> statement-breakpoint
CREATE UNIQUE INDEX "enquiries_reference_uq" ON "enquiries" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "enquiries_owner_status_idx" ON "enquiries" USING btree ("owner_user_id","status","created_at");--> statement-breakpoint
CREATE INDEX "enquiries_status_idx" ON "enquiries" USING btree ("status","submitted_at");--> statement-breakpoint
CREATE INDEX "enquiries_buyer_idx" ON "enquiries" USING btree ("buyer_user_id");--> statement-breakpoint
CREATE INDEX "enquiries_contact_idx" ON "enquiries" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "enquiry_history_enquiry_idx" ON "enquiry_history" USING btree ("enquiry_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "enquiry_items_line_uq" ON "enquiry_items" USING btree ("enquiry_id","line_no");--> statement-breakpoint
CREATE INDEX "enquiry_notes_enquiry_idx" ON "enquiry_notes" USING btree ("enquiry_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "quote_acceptances_revision_uq" ON "quote_acceptances" USING btree ("revision_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quote_access_tokens_hash_uq" ON "quote_access_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "quote_items_line_uq" ON "quote_items" USING btree ("revision_id","line_no");--> statement-breakpoint
CREATE UNIQUE INDEX "quote_revisions_no_uq" ON "quote_revisions" USING btree ("quote_id","revision_no");--> statement-breakpoint
CREATE INDEX "quote_revisions_status_idx" ON "quote_revisions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "quotes_number_uq" ON "quotes" USING btree ("quote_number");--> statement-breakpoint
CREATE INDEX "quotes_enquiry_idx" ON "quotes" USING btree ("enquiry_id");--> statement-breakpoint
CREATE INDEX "supplier_request_items_request_idx" ON "supplier_request_items" USING btree ("request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_requests_reference_uq" ON "supplier_requests" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "supplier_requests_vendor_idx" ON "supplier_requests" USING btree ("vendor_id","status","due_at");--> statement-breakpoint
CREATE INDEX "supplier_requests_enquiry_idx" ON "supplier_requests" USING btree ("enquiry_id");--> statement-breakpoint
CREATE INDEX "supplier_response_items_response_idx" ON "supplier_response_items" USING btree ("response_id");--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_responses_version_uq" ON "supplier_responses" USING btree ("request_id","version_no");--> statement-breakpoint
CREATE INDEX "audit_events_entity_idx" ON "audit_events" USING btree ("entity_type","entity_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_events_actor_idx" ON "audit_events" USING btree ("actor_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_events_vendor_idx" ON "audit_events" USING btree ("vendor_scope_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "content_pages_slug_uq" ON "content_pages" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_keys_scope_key_uq" ON "idempotency_keys" USING btree ("scope","key");--> statement-breakpoint
CREATE INDEX "notification_deliveries_status_idx" ON "notification_deliveries" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "outbox_events_pending_idx" ON "outbox_events" USING btree ("status","available_at");--> statement-breakpoint
CREATE INDEX "security_events_actor_idx" ON "security_events" USING btree ("actor_id","occurred_at");--> statement-breakpoint
CREATE INDEX "security_events_event_idx" ON "security_events" USING btree ("event","occurred_at");