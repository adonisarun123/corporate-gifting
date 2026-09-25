import { z } from "zod";

/** Claims that must not appear unless evidence is recorded (spec §4). */
const UNSUPPORTED_CLAIMS = [/\beco[- ]?friendly\b/i, /\bfood[- ]?safe\b/i, /\bpremium brand original\b/i, /\bBIS certified\b/i];

const noUnsupportedClaims = (s: string) => !UNSUPPORTED_CLAIMS.some((re) => re.test(s));
const claimMessage = "Unsupported claim wording (eco-friendly, food safe, BIS certified…) needs a verified product claim record";

export const productContentSchema = z.object({
  name: z.string().min(3).max(140),
  shortSummary: z.string().min(10).max(300).refine(noUnsupportedClaims, claimMessage),
  description: z.string().min(20).max(6000).refine(noUnsupportedClaims, claimMessage),
  keyBenefits: z.array(z.string().min(3).max(200)).min(1).max(8),
  recipientSuitability: z.string().min(5).max(500),
  limitations: z.string().max(1000).optional(),
  careInstructions: z.string().max(1000).optional(),
  specifications: z.array(z.object({ name: z.string().min(1).max(60), value: z.string().min(1).max(200), unit: z.string().max(20).optional() })).max(40).default([]),
  brandingMethods: z.array(z.string().min(2).max(60)).max(10).default([]),
  brandingNotes: z.string().max(1000).optional(),
  faqs: z.array(z.object({ question: z.string().min(5).max(200), answer: z.string().min(5).max(1000) })).max(12).default([]),
  seo: z.object({ title: z.string().max(70).optional(), description: z.string().max(160).optional(), noindex: z.boolean().optional() }).optional(),
});
export type ProductContentInput = z.infer<typeof productContentSchema>;

export const variantInputSchema = z.object({
  label: z.string().min(1).max(80),
  skuSuffix: z
    .string()
    .regex(/^[A-Z0-9]{1,12}(-[A-Z0-9]{1,12})?$/, "Use upper-case letters, digits and one hyphen, e.g. NV-750"),
  options: z.record(z.string(), z.unknown()).default({}),
});

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
