import { defineConfig } from "@neon/config/v1";

/**
 * Neon branch policy for project twilight-pond-28025207 (corporate-gifting).
 * Apply with `neon deploy` (alias of `neon config apply`) from a machine that
 * is signed in with `neon auth`.
 *
 * `buckets` is the GA key; `preview.buckets` is the deprecated spelling and
 * prints a deprecation warning on deploy, so the private `uploads` bucket is
 * declared at the top level.
 */
export default defineConfig({
  buckets: {
    uploads: { access: "private" },
  },
  branch: (branch) => {
    if (branch.isDefault) return {};
    if (!branch.exists) return { ttl: "7d" };
    return {};
  },
});
