import { z } from "zod";

/**
 * Typed environment. Rules:
 * - Empty strings count as unset (Vercel imports of .env.example produce "" for every key).
 * - Validation is lazy: it runs on first access, not at module load, so `next build` can collect
 *   page data without every secret present. Anything that actually needs the value still fails loudly.
 * - APP_ORIGIN falls back to Vercel's production URL when not set explicitly.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: z.enum(["development", "preview", "production"]).optional(),
  APP_ORIGIN: z.string().url(),
  DATABASE_URL: z.string().min(1, "DATABASE_URL (pooled endpoint, runtime role) is required"),
  DATABASE_URL_DIRECT: z.string().min(1).optional(),
  APP_DB_PASSWORD: z.string().optional(),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(20).default(5),
  AUTH_PROVIDER: z.enum(["dev", "clerk"]).default("dev"),
  /** Required for the dev identity adapter on any deployed environment (VERCEL_ENV set). */
  DEV_LOGIN_PASSCODE: z.string().min(8).optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  SESSION_SECRET: z.string().min(16).default("dev-only-session-secret-change-me"),
  QUOTE_LINK_SECRET: z.string().min(16).default("dev-only-quote-secret-change-me"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Corporate Gifting Hub <noreply@example.com>"),
  FEATURE_CONFIGURABLE_COMBOS: z.coerce.boolean().default(false),
  FEATURE_AI_CONCIERGE: z.coerce.boolean().default(false),
  FEATURE_BUYER_ORGS: z.coerce.boolean().default(false),
});

export type Env = z.infer<typeof schema>;

function rawEnv(): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(process.env)) out[k] = v === "" ? undefined : v;
  if (!out.APP_ORIGIN) {
    const vercelUrl = out.VERCEL_PROJECT_PRODUCTION_URL ?? out.VERCEL_URL;
    if (vercelUrl) out.APP_ORIGIN = `https://${vercelUrl}`;
    else if (out.NODE_ENV !== "production") out.APP_ORIGIN = "http://localhost:3000";
  }
  return out;
}

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  const raw = rawEnv();
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment: ${issues}`);
  }
  const deployedToProduction = raw.VERCEL_ENV === "production" || parsed.data.APP_ENV === "production";
  if (parsed.data.APP_ENV === "production" && parsed.data.AUTH_PROVIDER === "dev") {
    throw new Error("AUTH_PROVIDER=dev is not permitted when APP_ENV=production");
  }
  if (raw.VERCEL_ENV && parsed.data.AUTH_PROVIDER === "dev" && !parsed.data.DEV_LOGIN_PASSCODE) {
    throw new Error("Deployed environments using AUTH_PROVIDER=dev must set DEV_LOGIN_PASSCODE (min 8 chars)");
  }
  if (deployedToProduction && (parsed.data.SESSION_SECRET.startsWith("dev-only") || parsed.data.QUOTE_LINK_SECRET.startsWith("dev-only"))) {
    throw new Error("SESSION_SECRET and QUOTE_LINK_SECRET must be set on production deployments");
  }
  cached = parsed.data;
  return cached;
}

/** Lazy accessor: `env.X` validates on first touch. */
export const env: Env = new Proxy({} as Env, {
  get(_t, prop: string) {
    return loadEnv()[prop as keyof Env];
  },
});
