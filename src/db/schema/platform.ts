import { boolean, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { actorKindEnum, createdAt, id, updatedAt } from "./_shared";

/**
 * Business audit. Transactional with the mutation; append-only (grants + trigger in SQL).
 * before/after hold redacted field diffs, never raw request bodies.
 */
export const auditEvents = pgTable(
  "audit_events",
  {
    id: id(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorKind: actorKindEnum("actor_kind").notNull(),
    actorId: uuid("actor_id"),
    effectiveRole: text("effective_role"),
    vendorScopeId: uuid("vendor_scope_id"),
    customerScopeId: uuid("customer_scope_id"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    entityVersion: integer("entity_version"),
    before: jsonb("before").$type<Record<string, unknown> | null>(),
    after: jsonb("after").$type<Record<string, unknown> | null>(),
    reason: text("reason"),
    requestId: text("request_id"),
    correlationId: text("correlation_id"),
    /** "web" | "api" | "job" | "import" | "system" */
    source: text("source").notNull().default("web"),
    /** "success" | "denied" | "failed" */
    outcome: text("outcome").notNull().default("success"),
  },
  (t) => [
    index("audit_events_entity_idx").on(t.entityType, t.entityId, t.occurredAt),
    index("audit_events_actor_idx").on(t.actorId, t.occurredAt),
    index("audit_events_vendor_idx").on(t.vendorScopeId, t.occurredAt),
  ],
);

/** Access/security stream: denied actions, logins, private downloads. Written even when no business tx commits. */
export const securityEvents = pgTable(
  "security_events",
  {
    id: id(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorKind: actorKindEnum("actor_kind").notNull(),
    actorId: uuid("actor_id"),
    event: text("event").notNull(),
    outcome: text("outcome").notNull(),
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    requestId: text("request_id"),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    detail: jsonb("detail").$type<Record<string, unknown>>(),
  },
  (t) => [index("security_events_actor_idx").on(t.actorId, t.occurredAt), index("security_events_event_idx").on(t.event, t.occurredAt)],
);

export const outboxStatusEnum = pgEnum("outbox_status", ["pending", "processing", "done", "failed", "dead"]);

/** Transactional outbox. Written in the same tx as the business change; dispatched with leases. */
export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: id(),
    type: text("type").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    status: outboxStatusEnum("status").notNull().default("pending"),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(8),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    leaseOwner: text("lease_owner"),
    lastError: text("last_error"),
    correlationId: text("correlation_id"),
    createdAt: createdAt(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (t) => [index("outbox_events_pending_idx").on(t.status, t.availableAt)],
);

/** Per-handler idempotency for at-least-once delivery. */
export const processedEvents = pgTable(
  "processed_events",
  {
    eventId: uuid("event_id").notNull(),
    handler: text("handler").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.handler] })],
);

export const notificationDeliveries = pgTable(
  "notification_deliveries",
  {
    id: id(),
    outboxEventId: uuid("outbox_event_id"),
    channel: text("channel").notNull(),
    template: text("template").notNull(),
    /** Redacted: e-mail domain or masked phone only. */
    recipientMasked: text("recipient_masked").notNull(),
    status: text("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    providerMessageId: text("provider_message_id"),
    lastError: text("last_error"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("notification_deliveries_status_idx").on(t.status, t.updatedAt)],
);

export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    id: id(),
    scope: text("scope").notNull(),
    key: text("key").notNull(),
    requestHash: text("request_hash").notNull(),
    /** "in_progress" | "completed" */
    status: text("status").notNull().default("in_progress"),
    responseCode: integer("response_code"),
    responseBody: jsonb("response_body").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex("idempotency_keys_scope_key_uq").on(t.scope, t.key)],
);

/** Race-free public reference allocation (no MAX+1). */
export const referenceCounters = pgTable(
  "reference_counters",
  {
    kind: text("kind").notNull(),
    period: text("period").notNull(),
    nextValue: integer("next_value").notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.kind, t.period] })],
);

export const featureFlags = pgTable("feature_flags", {
  key: text("key").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: updatedAt(),
});

export const systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedBy: uuid("updated_by"),
  updatedAt: updatedAt(),
});

export const contentPages = pgTable(
  "content_pages",
  {
    id: id(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    /** "guide" | "page" */
    kind: text("kind").notNull().default("page"),
    body: text("body").notNull(),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    noindex: boolean("noindex").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    authorName: text("author_name"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("content_pages_slug_uq").on(t.slug)],
);
