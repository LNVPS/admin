import type { Footprint } from "lnvps-compose";
import type { AdminCustomPricingInfo } from "../lib/api";

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

/** Hours in a month on the 30-day basis the pricing engine uses. */
const MONTH_HOURS = 30 * 24;

/** Length of one of the plan's billing intervals, in hours. */
export function intervalHours(pricing: Pick<AdminCustomPricingInfo, "interval_type" | "interval_amount">): number {
  const per = { hour: 1, day: 24, month: MONTH_HOURS, year: 365 * 24 }[pricing.interval_type ?? "month"];
  return per * Math.max(1, pricing.interval_amount ?? 1);
}

/**
 * Re-express one of the plan's rates (the price for one billing interval, in
 * 1/`rate_scale` of the smallest currency unit) as a monthly amount in the
 * smallest currency unit. Plans quote per interval — an hourly plan's rates are
 * a fraction of a cent — so the raw number is not a monthly cent price.
 */
export function monthlyRate(
  rate: number,
  pricing: Pick<AdminCustomPricingInfo, "interval_type" | "interval_amount" | "rate_scale">,
): number {
  return (rate * (MONTH_HOURS / intervalHours(pricing))) / Math.max(1, pricing.rate_scale ?? 1);
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
  footprint: Footprint,
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

  // Rates are per billing interval; the suggestion is a monthly price.
  const cpu_cost = Math.ceil(monthlyRate(pricing.cpu_cost, pricing) * cpu_cores);
  const memory_cost = Math.ceil(monthlyRate(pricing.memory_cost, pricing) * memory_gb);
  const disk_cost = disk_rate ? Math.ceil(monthlyRate(disk_rate.cost, pricing) * disk_gb) : 0;

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
  footprint: Footprint,
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
