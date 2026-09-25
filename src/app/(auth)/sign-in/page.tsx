import type { Metadata } from "next";
import { env } from "@/lib/env";
import { getDb, withContextTransaction } from "@/db/client";
import { users } from "@/db/schema";
import { systemContext } from "@/modules/identity/actor";
import { devSignIn } from "./actions";
import { SiteHeader } from "@/components/layout/header";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  if (env.AUTH_PROVIDER !== "dev") {
    return (
      <>
        <SiteHeader />
        <main id="main" className="container-x py-12"><div className="card mx-auto max-w-md p-6"><h1 className="text-xl font-bold">Sign in</h1><p className="mt-2 text-sm text-ink-muted">This deployment uses Clerk for sign-in. Mount the Clerk sign-in component here when the provider is enabled.</p></div></main>
      </>
    );
  }
  const list = await withContextTransaction(systemContext(), (tx) => tx.select({ subject: users.authSubject, name: users.displayName, email: users.email, status: users.status }).from(users).orderBy(users.email), getDb());
  return (
    <>
      <SiteHeader />
      <main id="main" className="container-x py-12">
        <form action={devSignIn} className="card mx-auto max-w-md space-y-4 p-6">
          <h1 className="text-xl font-bold">Sign in (development)</h1>
          <p className="text-sm text-ink-muted">Local identity adapter: choose a seeded user. Production uses Clerk with MFA; memberships and roles always come from the database.</p>
          {error && <p className="field-error">Unknown user.</p>}
          <input type="hidden" name="next" value={next ?? "/account"} />
          <label className="label" htmlFor="subject">User</label>
          <select id="subject" name="subject" className="input" required>
            {list.map((u) => <option key={u.subject} value={u.subject}>{u.name} · {u.email}{u.status !== "active" ? ` (${u.status})` : ""}</option>)}
          </select>
          <button className="btn-primary w-full" type="submit">Sign in</button>
        </form>
      </main>
    </>
  );
}
