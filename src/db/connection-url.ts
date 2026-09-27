/**
 * pg (via pg-connection-string) now treats sslmode=prefer|require|verify-ca as verify-full and warns
 * on every pool it creates. Neon's certificates are publicly trusted, so verify-full is what already
 * runs; spelling it out keeps behaviour identical and silences the warning. URLs without sslmode
 * (local Docker Postgres) and sslmode=disable are left untouched.
 */
export function normalizeSslMode(url: string): string {
  return url.replace(/([?&]sslmode=)(prefer|require|verify-ca)(?=&|$)/i, "$1verify-full");
}
