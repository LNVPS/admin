import type { AdminCustomPricingInfo } from "../lib/api";
import type { ComposeFootprint } from "../lib/composeSchema";

/** 1 GB as used by the pricing engine (binary gibibyte). */
export const PRICING_GB = 1024 ** 3;

/** How resource quantities are converted into billable units. */
export type PricingRounding =
  /** Bill fractional cores/GB exactly as used (fair for sub-core apps). */
  | "prorated"
  /** Round each resource up to whole cores/GB, matching VM custom pricing. */
  | "vm";

type DiskRate = AdminCustomPricingInfo["disk_pricing"][number];

export interface SuggestedAppPrice {
  /** Pricing model the suggestion was derived from. */
  pricing: AdminCustomPricingInfo;
  currency: string;
  /** Monthly cost per resource, in the smallest currency unit. */
  cpu_cost: number;
  memory_cost: number;
  disk_cost: number;
  /** Total monthly cost in the smallest currency unit. */
  total_monthly_cost: number;
  /** Billable units the costs were derived from (after rounding). */
  cpu_cores: number;
  memory_gb: number;
  disk_gb: number;
  /** Disk pricing row used, if the app needs storage. */
  disk_rate: DiskRate | null;
}

function billableUnits(value: number, rounding: PricingRounding): number {
  return rounding === "vm" ? Math.ceil(value) : value;
}

/**
 * Price an app's compose footprint with one custom pricing model and one of its
 * disk rates: `cpu_cost` per core, `memory_cost` per GB RAM and `disk_rate.cost`
 * per GB of persistent storage.
 *
 * IP costs are excluded — app deployments share the cluster ingress and get no
 * dedicated addresses. `rounding: "prorated"` bills fractional cores/GB (apps
 * are typically sub-core); `"vm"` rounds each resource up like VM pricing does.
 *
 * When `diskRate` is omitted the cheapest rate on the model is used; returns
 * `null` if the app needs storage and the model has no disk pricing at all,
 * since the storage cost would otherwise be silently dropped.
 */
export function suggestAppPrice(
  footprint: ComposeFootprint,
  pricing: AdminCustomPricingInfo,
  rounding: PricingRounding = "prorated",
  diskRate?: DiskRate,
): SuggestedAppPrice | null {
  const disk_rate =
    diskRate ??
    (pricing.disk_pricing.length > 0
      ? pricing.disk_pricing.reduce((cheapest, row) => (row.cost < cheapest.cost ? row : cheapest))
      : null);
  if (footprint.storage_bytes > 0 && !disk_rate) return null;

  const cpu_cores = billableUnits(footprint.cpu_milli / 1000, rounding);
  const memory_gb = billableUnits(footprint.memory_bytes / PRICING_GB, rounding);
  const disk_gb = billableUnits(footprint.storage_bytes / PRICING_GB, rounding);

  const cpu_cost = Math.ceil(pricing.cpu_cost * cpu_cores);
  const memory_cost = Math.ceil(pricing.memory_cost * memory_gb);
  const disk_cost = disk_rate ? Math.ceil(disk_rate.cost * disk_gb) : 0;

  return {
    pricing,
    currency: pricing.currency,
    cpu_cost,
    memory_cost,
    disk_cost,
    total_monthly_cost: cpu_cost + memory_cost + disk_cost,
    cpu_cores,
    memory_gb,
    disk_gb,
    disk_rate,
  };
}

export interface SuggestedAppPriceRange {
  currency: string;
  /** Cheapest and dearest priced combination (identical when only one exists). */
  min: SuggestedAppPrice;
  max: SuggestedAppPrice;
  /** How many plan × disk-rate combinations were priced. */
  combinations: number;
  /** Distinct regions covered by those combinations. */
  regions: number;
}

/**
 * Price the footprint against every enabled custom pricing plan and every disk
 * rate within each plan, returning the resulting cost range.
 *
 * A region can have several plans and each plan several storage tiers, so the
 * realistic cost of an app is a band rather than a single number. Only plans in
 * `currency` are considered (costs across currencies aren't comparable without
 * an FX conversion); returns `null` when nothing in that currency can be priced.
 */
export function suggestAppPriceRange(
  footprint: ComposeFootprint,
  pricings: AdminCustomPricingInfo[],
  currency: string,
  rounding: PricingRounding = "prorated",
): SuggestedAppPriceRange | null {
  const priced: SuggestedAppPrice[] = [];
  for (const pricing of pricings) {
    if (pricing.currency !== currency) continue;
    // No storage → disk rates are irrelevant, so the plan yields a single price.
    const rates: (DiskRate | undefined)[] =
      footprint.storage_bytes > 0 && pricing.disk_pricing.length > 0 ? pricing.disk_pricing : [undefined];
    for (const rate of rates) {
      const result = suggestAppPrice(footprint, pricing, rounding, rate);
      if (result) priced.push(result);
    }
  }
  if (priced.length === 0) return null;

  const sorted = [...priced].sort((a, b) => a.total_monthly_cost - b.total_monthly_cost);
  return {
    currency,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    combinations: sorted.length,
    regions: new Set(priced.map((p) => p.pricing.region_id)).size,
  };
}
