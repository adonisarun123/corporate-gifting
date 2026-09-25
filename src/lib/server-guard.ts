/**
 * Import-time guard: server modules must never end up in a browser bundle.
 * (`server-only` throws under vitest/tsx, so this lightweight check is used instead.)
 */
if (typeof window !== "undefined") {
  throw new Error("This module is server-only and was imported into a browser bundle.");
}
export {};
