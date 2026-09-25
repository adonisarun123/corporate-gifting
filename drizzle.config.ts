import { defineConfig } from "drizzle-kit";
import "dotenv/config";

// Uses the DIRECT (non-pooled) connection: migrations never run through the pooler.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dbCredentials: { url: process.env.DATABASE_URL_DIRECT ?? "" },
  strict: true,
  verbose: true,
});
