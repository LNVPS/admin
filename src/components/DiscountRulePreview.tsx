import { PlayIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import type { AdminDiscountPreviewResult, DiscountPreviewOrder } from "../lib/api";
import { formatCurrency } from "../utils/currency";
import { Button } from "./Button";
import { CurrencySelect } from "./MoneyInput";

/** Human-readable form of a minor-units money figure (sats for BTC). */
export function minorUnitsHuman(amount: number, currency: string): string {
  return currency === "BTC" ? `${Math.round(amount / 1000).toLocaleString()} sats` : formatCurrency(amount, currency);
}

export interface RulePreviewInput {
  /** Order total in minor units; empty = use the sample default. */
  amount: string;
  currency: string;
  intervals: string;
  intervalType: "day" | "month" | "year";
  isNew: boolean;
  country: string;
  orderCount: string;
}

export const DEFAULT_RULE_PREVIEW: RulePreviewInput = {
  amount: "",
  currency: "EUR",
  intervals: "1",
  intervalType: "month",
  isNew: true,
  country: "",
  orderCount: "",
};

function buildPreviewOrder(input: RulePreviewInput): DiscountPreviewOrder | undefined {
  const order: DiscountPreviewOrder = {};
  if (input.amount !== "") {
    const parsed = parseInt(input.amount, 10);
    if (!Number.isNaN(parsed) && parsed >= 0) order.amount = parsed;
  }
  if (input.intervals !== "") {
    const parsed = parseInt(input.intervals, 10);
    if (!Number.isNaN(parsed) && parsed > 0) order.intervals = parsed;
  }
  // The server fills in a sample order for anything omitted here.
  if (Object.keys(order).length === 0) return undefined;
  return {
    ...order,
    currency: input.currency,
    interval_type: input.intervalType,
    is_new: input.isNew,
    country: input.country || null,
    orders: input.orderCount !== "" ? Math.max(0, parseInt(input.orderCount, 10) || 0) : undefined,
  };
}

// Form fields inherit the app-global input/select styling from index.css, which
// is unlayered and therefore beats Tailwind width utilities — any fixed width
// has to live on a wrapper element, not on the control itself.

/**
 * Evaluate a discount rule against a sample order with the
 * `/discounts/preview` endpoint, without saving anything — so raw CEL can be
 * checked before customers meet it.
 *
 * Omitted sample fields fall back to a representative order (a new 100.00 EUR
 * monthly order for an Irish customer with no history, one 2-core VM line), so
 * previewing with everything empty is a valid smoke test for a rule.
 */
export function RulePreviewPanel({ rule }: { rule: string }) {
  const adminApi = useAdminApi();
  const [input, setInput] = useState<RulePreviewInput>(DEFAULT_RULE_PREVIEW);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AdminDiscountPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePreview = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await adminApi.previewDiscountRule(rule, buildPreviewOrder(input)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-600 bg-slate-900/40 p-4">
      <h4 className="mb-3 text-sm font-semibold text-slate-200">Preview against a sample order</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Order amount ({input.currency === "BTC" ? "millisats" : `${input.currency} minor units`})
          </label>
          <input
            type="number"
            min="0"
            value={input.amount}
            onChange={(e) => setInput({ ...input, amount: e.target.value })}
            placeholder="sample default"
          />
          {input.amount !== "" && !Number.isNaN(parseInt(input.amount, 10)) && (
            <p className="mt-1 text-xs text-slate-500">
              ≈ {minorUnitsHuman(parseInt(input.amount, 10), input.currency)}
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Currency</label>
          <CurrencySelect value={input.currency} onChange={(currency) => setInput({ ...input, currency })} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Billing interval</label>
          <div className="grid grid-cols-[1fr_7rem] gap-2">
            <input
              type="number"
              min="1"
              value={input.intervals}
              onChange={(e) => setInput({ ...input, intervals: e.target.value })}
            />
            <select
              value={input.intervalType}
              onChange={(e) => setInput({ ...input, intervalType: e.target.value as "day" | "month" | "year" })}
            >
              <option value="day">day</option>
              <option value="month">month</option>
              <option value="year">year</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Customer country (ISO alpha-3)</label>
          <input
            type="text"
            value={input.country}
            onChange={(e) => setInput({ ...input, country: e.target.value.toUpperCase() })}
            placeholder="e.g. IRL (sample default)"
            maxLength={3}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Prior settled orders</label>
          <input
            type="number"
            min="0"
            value={input.orderCount}
            onChange={(e) => setInput({ ...input, orderCount: e.target.value })}
            placeholder="0"
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={input.isNew}
              onChange={(e) => setInput({ ...input, isNew: e.target.checked })}
            />
            New order (is_new)
          </label>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Empty fields use the server's sample order: a new 100.00 EUR monthly order for an Irish customer with no order
        history, containing one standard 2-core VM line.
      </p>
      <div className="mt-3">
        <Button size="sm" onClick={handlePreview} isLoading={loading}>
          <PlayIcon className="h-4 w-4 mr-1.5" />
          Preview rule
        </Button>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
      )}

      {result && (
        <div
          className={`mt-3 rounded-lg border p-3 ${
            result.error
              ? "border-red-500/30 bg-red-500/10"
              : result.applies
                ? "border-green-500/30 bg-green-500/10"
                : "border-slate-600 bg-slate-800/40"
          }`}
        >
          {result.error ? (
            <p className="text-sm text-red-300">
              <span className="font-semibold">Rule error:</span> {result.error}
            </p>
          ) : result.applies ? (
            <div className="space-y-1 text-sm">
              <p className="text-green-400">
                <span className="font-semibold">Applies</span>
                {result.percent != null && <> — {result.percent}% off</>}
                {result.amount != null && (
                  <> — {minorUnitsHuman(result.amount, result.currency ?? input.currency)} off</>
                )}
              </p>
              <p className="text-slate-400">
                Sample order reduced by{" "}
                <span className="font-mono text-slate-200">
                  {minorUnitsHuman(result.amount_off ?? 0, input.currency)}
                </span>{" "}
                (after clamping).
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              Does <span className="font-semibold">not</span> apply to this sample order.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
