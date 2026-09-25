import { businessRule } from "@/lib/errors";

export interface Tier {
  minQuantity: number; // inclusive
  maxQuantity: number | null; // inclusive; null = open-ended
  unitCostMinor: number;
}

/** Validate MOQ and increment before any tier lookup (spec §18). */
export function validateQuantity(quantity: number, moq: number, increment: number): void {
  if (!Number.isInteger(quantity) || quantity <= 0) throw businessRule("Quantity must be a positive whole number", { quantity: ["positive integer required"] });
  if (quantity < moq) throw businessRule(`Minimum order quantity is ${moq}`, { quantity: [`minimum ${moq}`] });
  if (increment > 1 && (quantity - moq) % increment !== 0) {
    throw businessRule(`Quantity must increase in steps of ${increment} from ${moq}`, { quantity: [`increment ${increment}`] });
  }
}

/** Lower bound inclusive, upper bound inclusive. Returns null if no tier covers the quantity. */
export function selectTier(tiers: readonly Tier[], quantity: number): Tier | null {
  for (const t of tiers) {
    if (quantity >= t.minQuantity && (t.maxQuantity === null || quantity <= t.maxQuantity)) return t;
  }
  return null;
}

/** Overlap check mirrors the EXCLUDE constraint so imports fail fast with a readable message. */
export function assertNoTierOverlap(tiers: readonly Tier[]): void {
  const sorted = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    if (prev.maxQuantity === null || cur.minQuantity <= prev.maxQuantity) {
      throw businessRule(`Price tiers overlap at quantity ${cur.minQuantity}`);
    }
  }
}

/** Available-to-promise: planning figure only; an enquiry never reserves stock. */
export function availableToPromise(onHand: number, reserved: number, safetyStock: number): number {
  return Math.max(0, onHand - reserved - safetyStock);
}

export interface KitComponentSupply {
  /** Underlying supply key (e.g. offer or SKU). Repeated keys are combined before division. */
  supplyKey: string;
  unitsPerKit: number;
  availableUnits: number;
}

/**
 * Maximum kits from stock for a fixed kit with one confirmed supply pool per component.
 * Repeated uses of the same SKU are combined first (AC-12), then min over floor(available / unitsPerKit).
 */
export function maxKitsFromStock(components: readonly KitComponentSupply[]): number {
  if (components.length === 0) return 0;
  const demand = new Map<string, { units: number; available: number }>();
  for (const c of components) {
    if (c.unitsPerKit <= 0) throw new RangeError("unitsPerKit must be positive");
    const cur = demand.get(c.supplyKey);
    if (cur) {
      cur.units += c.unitsPerKit;
      // The same pool must report the same availability; take the minimum defensively.
      cur.available = Math.min(cur.available, c.availableUnits);
    } else {
      demand.set(c.supplyKey, { units: c.unitsPerKit, available: c.availableUnits });
    }
  }
  let kits = Number.POSITIVE_INFINITY;
  for (const { units, available } of demand.values()) {
    kits = Math.min(kits, Math.floor(available / units));
  }
  return Number.isFinite(kits) ? kits : 0;
}

/** Stock freshness policy: default 7 days for ordinary stock (spec §34); shorter windows configurable per category. */
export function stockState(observedAt: Date | null, supplyMode: string, now = new Date(), freshnessDays = 7): "fresh" | "stale" | "unknown" | "made_to_order" {
  if (supplyMode === "made_to_order") return "made_to_order";
  if (!observedAt) return "unknown";
  const ageMs = now.getTime() - observedAt.getTime();
  return ageMs <= freshnessDays * 86_400_000 ? "fresh" : "stale";
}
