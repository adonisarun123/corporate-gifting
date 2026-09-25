import { sql } from "drizzle-orm";
import type { Tx } from "@/db/client";
import { auditEvents, securityEvents } from "@/db/schema";

export interface AuditInput {
  actorKind: "visitor" | "buyer" | "vendor" | "platform" | "system";
  actorId?: string | null;
  effectiveRole?: string | null;
  vendorScopeId?: string | null;
  customerScopeId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  entityVersion?: number | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
  source?: "web" | "api" | "job" | "import" | "system";
  outcome?: "success" | "denied" | "failed";
}

const REDACT_KEYS = new Set(["password", "token", "tokenHash", "secret", "authSubject", "bankAccount", "artwork"]);

/** Field-level diff with secrets removed. Never store request bodies wholesale. */
export function redact(obj: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!obj) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (REDACT_KEYS.has(k)) continue;
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Appends a business audit event INSIDE the caller's transaction. If this insert
 * fails, the surrounding mutation rolls back (AC-18).
 */
export async function appendAudit(tx: Tx, input: AuditInput): Promise<void> {
  const requestId = await currentRequestId(tx);
  await tx.insert(auditEvents).values({
    actorKind: input.actorKind,
    actorId: input.actorId ?? null,
    effectiveRole: input.effectiveRole ?? null,
    vendorScopeId: input.vendorScopeId ?? null,
    customerScopeId: input.customerScopeId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    entityVersion: input.entityVersion ?? null,
    before: redact(input.before),
    after: redact(input.after),
    reason: input.reason ?? null,
    requestId,
    correlationId: requestId,
    source: input.source ?? "web",
    outcome: input.outcome ?? "success",
  });
}

async function currentRequestId(tx: Tx): Promise<string | null> {
  const r = await tx.execute<{ rid: string | null }>(sql`select nullif(current_setting('app.request_id', true), '') as rid`);
  return r.rows[0]?.rid ?? null;
}

/** Security stream: denied actions and access events. Written outside business transactions. */
export async function recordSecurityEvent(
  exec: { insert: Tx["insert"] },
  input: {
    actorKind: AuditInput["actorKind"];
    actorId?: string | null;
    event: string;
    outcome: "success" | "denied" | "failed";
    resourceType?: string;
    resourceId?: string;
    requestId?: string | null;
    detail?: Record<string, unknown>;
  },
): Promise<void> {
  await exec.insert(securityEvents).values({
    actorKind: input.actorKind,
    actorId: input.actorId ?? null,
    event: input.event,
    outcome: input.outcome,
    resourceType: input.resourceType ?? null,
    resourceId: input.resourceId ?? null,
    requestId: input.requestId ?? null,
    detail: input.detail ?? null,
  });
}
