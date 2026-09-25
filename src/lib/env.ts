import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ORIGIN: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  DATABASE_URL_DIRECT: z.string().min(1).optional(),
  APP_DB_PASSWORD: z.string().optional(),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(20).default(5),
  AUTH_PROVIDER: z.enum(["dev", "clerk"]).default("dev"),
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

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment: ${issues}`);
  }
  // `next build` sets NODE_ENV=production everywhere, so the deployment target is the real guard.
  const deployedToProduction = process.env.VERCEL_ENV === "production" || process.env.APP_ENV === "production";
  if (deployedToProduction && parsed.data.AUTH_PROVIDER === "dev") {
    throw new Error("AUTH_PROVIDER=dev is not permitted in a production deployment");
  }
  return parsed.data;
}

export const env: Env = load();
