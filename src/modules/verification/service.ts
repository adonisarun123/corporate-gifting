import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, withContextTransaction, type Db, type Tx } from "@/db/client";
import { contactVerifications } from "@/db/schema";
import { systemContext } from "@/modules/identity/actor";
import { businessRule, notFound } from "@/lib/errors";
import { sha256Hex } from "@/lib/auth/signing";
import { getNotificationAdapter } from "@/lib/notifications/adapter";
import { randomInt } from "node:crypto";

export const startVerificationSchema = z.object({ email: z.string().email() });
export const confirmVerificationSchema = z.object({ verificationId: z.string().uuid(), code: z.string().regex(/^\d{6}$/) });

const TTL_MS = 15 * 60_000;
const MAX_ATTEMPTS = 5;

/** Creates a 6-digit code (hashed at rest) and sends it. In dev the log adapter prints it. */
export async function startEmailVerification(raw: unknown, db: Db = getDb()) {
  const { email } = startVerificationSchema.parse(raw);
  const value = email.toLowerCase();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const row = await withContextTransaction(
    systemContext(),
    async (tx) => {
      const [r] = await tx
        .insert(contactVerifications)
        .values({ channel: "email", value, codeHash: sha256Hex(`${value}:${code}`), expiresAt: new Date(Date.now() + TTL_MS) })
        .returning({ id: contactVerifications.id, expiresAt: contactVerifications.expiresAt });
      if (!r) throw new Error("verification insert failed");
      return r;
    },
    db,
  );
  // Sending happens after commit; a send failure never loses the verification row.
  await getNotificationAdapter().sendEmail({
    to: value,
    template: "verification_code",
    subject: "Your Corporate Gifting Hub verification code",
    text: `Your verification code is ${code}. It expires in 15 minutes. If you did not request this, ignore this e-mail.`,
  });
  return {
    verificationId: row.id,
    expiresAt: row.expiresAt,
    channel: "email" as const,
    // Exposed ONLY under NODE_ENV=test so integration tests can complete the flow without e-mail.
    ...(process.env.NODE_ENV === "test" ? { testOnlyCode: code } : {}),
  };
}

export async function confirmEmailVerification(raw: unknown, db: Db = getDb()) {
  const { verificationId, code } = confirmVerificationSchema.parse(raw);
  return withContextTransaction(
    systemContext(),
    async (tx) => {
      const [v] = await tx.select().from(contactVerifications).where(eq(contactVerifications.id, verificationId)).for("update");
      if (!v) throw notFound("Verification not found");
      if (v.verifiedAt) return { verified: true as const, email: v.value };
      if (v.expiresAt < new Date()) throw businessRule("Verification code has expired; request a new one", { code: ["expired"] });
      if (v.attempts >= MAX_ATTEMPTS) throw businessRule("Too many attempts; request a new code", { code: ["locked"] });
      if (sha256Hex(`${v.value}:${code}`) !== v.codeHash) {
        await tx.update(contactVerifications).set({ attempts: sql`${contactVerifications.attempts} + 1` }).where(eq(contactVerifications.id, v.id));
        throw businessRule("Incorrect code", { code: ["mismatch"] });
      }
      await tx.update(contactVerifications).set({ verifiedAt: new Date() }).where(eq(contactVerifications.id, v.id));
      return { verified: true as const, email: v.value };
    },
    db,
  );
}

/** Used by enquiry submission inside its own transaction: verified, unconsumed, matches the e-mail. */
export async function consumeVerification(tx: Tx, verificationId: string, email: string): Promise<void> {
  const [v] = await tx
    .select()
    .from(contactVerifications)
    .where(and(eq(contactVerifications.id, verificationId), isNull(contactVerifications.consumedAt), gt(contactVerifications.expiresAt, sql`now() - interval '24 hours'`)))
    .for("update");
  if (!v || !v.verifiedAt) throw businessRule("Contact e-mail has not been verified", { contactVerificationId: ["not verified"] });
  if (v.value !== email.toLowerCase()) throw businessRule("Verified e-mail does not match the enquiry contact", { email: ["mismatch"] });
  await tx.update(contactVerifications).set({ consumedAt: new Date() }).where(eq(contactVerifications.id, v.id));
}
