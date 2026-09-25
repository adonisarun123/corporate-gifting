import { createHmac, timingSafeEqual, createHash, randomBytes } from "node:crypto";

export function hmacSign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

/** value.signature — verify returns the value or null. */
export function signValue(value: string, secret: string): string {
  return `${value}.${hmacSign(value, secret)}`;
}

export function verifySigned(signed: string | undefined | null, secret: string): string | null {
  if (!signed) return null;
  const idx = signed.lastIndexOf(".");
  if (idx <= 0) return null;
  const value = signed.slice(0, idx);
  const sig = signed.slice(idx + 1);
  const expected = hmacSign(value, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return value;
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
