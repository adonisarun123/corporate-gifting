import "@/lib/server-guard";
import type { NextResponse } from "next/server";
import { getActor, getCartTokenHash, getOrCreateCartTokenHash, CART_COOKIE } from "@/lib/auth/session";
import { isAuthenticated } from "@/modules/identity/actor";
import type { CartOwner } from "@/modules/carts/service";

/** Resolve the cart owner for a request. For new guests, returns the cookie to set on the response. */
export async function resolveCartOwner(requestId: string, create = true): Promise<{ owner: CartOwner | null; setCookie: string | null }> {
  const actor = await getActor();
  if (isAuthenticated(actor)) return { owner: { kind: "user", actor }, setCookie: null };
  if (!create) {
    const hash = await getCartTokenHash();
    return { owner: hash ? { kind: "guest", tokenHash: hash, requestId } : null, setCookie: null };
  }
  const { hash, setCookie } = await getOrCreateCartTokenHash();
  return { owner: { kind: "guest", tokenHash: hash, requestId }, setCookie };
}

export function applyCartCookie(res: NextResponse, token: string | null): NextResponse {
  if (token) {
    res.cookies.set(CART_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 86_400 });
  }
  return res;
}
