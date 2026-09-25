import "@/lib/server-guard";
import { Pool, type PoolClient } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import * as schema from "./schema";
import { env } from "@/lib/env";

export type Db = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * Runtime pool: pooled Neon endpoint, small and bounded. Neon's pooler is
 * transaction-mode, so nothing here relies on session state across queries.
 */
const globalForDb = globalThis as unknown as { __cghPool?: Pool };

export function getPool(): Pool {
  if (!globalForDb.__cghPool) {
    globalForDb.__cghPool = new Pool({
      connectionString: env.DATABASE_URL,
      max: env.DB_POOL_MAX,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      // pg returns bigint as string; our money columns are bounded well below 2^53.
      types: undefined,
    });
  }
  return globalForDb.__cghPool;
}

export function getDb(): Db {
  return drizzle(getPool(), { schema });
}

/** Trusted, server-derived request context. Never built from client-supplied values. */
export interface DbContext {
  actorKind: "visitor" | "buyer" | "vendor" | "platform" | "system";
  actorId?: string | null;
  vendorId?: string | null;
  requestId?: string | null;
}

/**
 * One checked-out connection, one explicit transaction, transaction-local
 * context via set_config(..., true). Commit/rollback happen on that same
 * connection, so pooled-connection reuse cannot leak context (AC-17).
 */
export async function withContextTransaction<T>(
  ctx: DbContext,
  fn: (tx: Tx) => Promise<T>,
  db: Db = getDb(),
): Promise<T> {
  return db.transaction(async (tx) => {
    await applyContext(tx, ctx);
    return fn(tx);
  });
}

export async function applyContext(tx: Tx, ctx: DbContext): Promise<void> {
  // Parameterised; the third argument `true` makes it transaction-local.
  await tx.execute(sql`select
    set_config('app.actor_kind', ${ctx.actorKind}, true),
    set_config('app.actor_id', ${ctx.actorId ?? ""}, true),
    set_config('app.vendor_id', ${ctx.vendorId ?? ""}, true),
    set_config('app.request_id', ${ctx.requestId ?? ""}, true)`);
}

/** For scripts and tests that need a raw client on the direct URL. */
export async function withDirectClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString: env.DATABASE_URL_DIRECT, max: 1 });
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
    await pool.end();
  }
}
