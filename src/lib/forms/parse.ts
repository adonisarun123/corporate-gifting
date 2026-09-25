import { ZodError } from "zod";
import { isAppError } from "@/lib/errors";

/** FormData → plain object; repeated keys become arrays; "field.0.sub" becomes nested. */
export function formToObject(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, raw] of fd.entries()) {
    if (typeof raw !== "string") continue;
    const value = raw;
    const parts = key.split(".");
    let cur: Record<string, unknown> | unknown[] = out;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i]!;
      const last = i === parts.length - 1;
      const nextIsIndex = !last && /^\d+$/.test(parts[i + 1]!);
      if (Array.isArray(cur)) {
        const idx = Number(p);
        if (last) cur[idx] = value;
        else { cur[idx] ??= nextIsIndex ? [] : {}; cur = cur[idx] as Record<string, unknown>; }
      } else {
        if (last) {
          if (p in cur) { const prev = cur[p]; cur[p] = Array.isArray(prev) ? [...prev, value] : [prev, value]; }
          else cur[p] = value;
        } else { cur[p] ??= nextIsIndex ? [] : {}; cur = cur[p] as Record<string, unknown>; }
      }
    }
  }
  return out;
}

export const num = (v: unknown) => (v === "" || v === undefined || v === null ? undefined : Number(v));
export const rupeesToMinor = (v: unknown) => (v === "" || v === undefined ? undefined : Math.round(Number(v) * 100));
export const bool = (v: unknown) => v === "on" || v === "true";
export const str = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined);
export const list = (v: unknown) => (typeof v === "string" ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);

/** Turns thrown errors into a redirect-safe message string. */
export function errorMessage(e: unknown): string {
  if (e instanceof ZodError) return e.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ");
  if (isAppError(e)) return e.message + (e.fieldErrors ? " — " + Object.entries(e.fieldErrors).map(([k, v]) => `${k}: ${v.join(", ")}`).join("; ") : "");
  if (e instanceof Error) return e.message;
  return "Unexpected error";
}
