"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { devSessionCookieValue, SESSION_COOKIE } from "@/lib/auth/session";
import { getDb, withContextTransaction } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { systemContext } from "@/modules/identity/actor";
import { recordSecurityEvent } from "@/modules/audit/service";
import { getCartTokenHash } from "@/lib/auth/session";
import { mergeGuestCartIntoUser } from "@/modules/carts/service";
import { resolveActorByUserId } from "@/modules/identity/service";

/** Dev-only sign-in: picks a seeded user. Refuses outside AUTH_PROVIDER=dev. */
export async function devSignIn(formData: FormData) {
  if (env.AUTH_PROVIDER !== "dev") throw new Error("Dev sign-in is disabled");
  const subject = String(formData.get("subject") ?? "");
  const user = await withContextTransaction(systemContext(), (tx) => tx.query.users.findFirst({ where: eq(users.authSubject, subject) }), getDb());
  if (!user) redirect("/sign-in?error=unknown");
  const jar = await cookies();
  jar.set(SESSION_COOKIE, devSessionCookieValue(subject), { httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: 8 * 3600 });
  await withContextTransaction(systemContext(), (tx) => recordSecurityEvent(tx, { actorKind: "buyer", actorId: user.id, event: "auth.login", outcome: "success" }), getDb());
  const guestHash = await getCartTokenHash();
  if (guestHash) {
    const actor = await resolveActorByUserId(user.id, "signin");
    if (actor) await mergeGuestCartIntoUser(actor, guestHash);
  }
  redirect(String(formData.get("next") ?? "/account"));
}

export async function signOut() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/");
}
