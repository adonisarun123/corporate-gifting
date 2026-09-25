import "@/lib/server-guard";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";
import { signValue, verifySigned, sha256Hex, randomToken } from "./signing";
import { resolveActorBySubject } from "@/modules/identity/service";
import type { Actor } from "@/modules/identity/actor";

export const SESSION_COOKIE = "cgh_session";
export const CART_COOKIE = "cgh_cart";

/**
 * Identity adapter boundary. `dev`: a signed cookie carrying the auth subject of a seeded user.
 * `clerk`: verifies the Clerk session (package installed at integration time; membership stays in Neon).
 */
async function currentSubject(): Promise<string | null> {
  if (env.AUTH_PROVIDER === "dev") {
    const jar = await cookies();
    return verifySigned(jar.get(SESSION_COOKIE)?.value, env.SESSION_SECRET);
  }
  // Clerk adapter: resolved lazily so the dependency is optional until the provider is switched on.
  const mod = "@clerk/nextjs/server";
  try {
    const clerk = (await import(/* webpackIgnore: true */ mod)) as { auth: () => Promise<{ userId: string | null }> };
    const { userId } = await clerk.auth();
    return userId ? `clerk:${userId}` : null;
  } catch {
    throw new Error("AUTH_PROVIDER=clerk requires @clerk/nextjs to be installed and configured");
  }
}

export const getRequestId = cache(async (): Promise<string> => {
  const h = await headers();
  return h.get("x-request-id") ?? randomUUID();
});

/** Per-request memoised actor. Every protected call re-resolves membership from the database. */
export const getActor = cache(async (): Promise<Actor> => {
  const requestId = await getRequestId();
  const subject = await currentSubject();
  if (!subject) return { kind: "visitor", requestId };
  const actor = await resolveActorBySubject(subject, requestId);
  return actor ?? { kind: "visitor", requestId };
});

export function devSessionCookieValue(subject: string): string {
  return signValue(subject, env.SESSION_SECRET);
}

/** Guest cart identity: raw token in an httpOnly cookie; only its hash is stored. */
export async function getOrCreateCartTokenHash(): Promise<{ hash: string; setCookie: string | null }> {
  const jar = await cookies();
  const existing = jar.get(CART_COOKIE)?.value;
  if (existing) return { hash: sha256Hex(existing), setCookie: null };
  const token = randomToken();
  return { hash: sha256Hex(token), setCookie: token };
}

export async function getCartTokenHash(): Promise<string | null> {
  const jar = await cookies();
  const v = jar.get(CART_COOKIE)?.value;
  return v ? sha256Hex(v) : null;
}
