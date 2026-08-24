import type React from "react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAdminApi } from "../hooks/useAdminApi";
import { useApiCall } from "../hooks/useApiCall";
import type { VmTrafficSummary } from "../lib/api";
import { formatTransferBytes, TRANSFER_GB_BYTES } from "../utils/formatBytes";

interface VmTrafficPanelProps {
  vmId: number;
  /**
   * Summary already carried by the VM detail response. Rendered immediately so
   * the usage bar does not wait on the daily breakdown request.
   */
  summary?: VmTrafficSummary;
}

/** Inclusive UTC date bounds, formatted as the API's YYYY-MM-DD. */
function utcDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

type RangeKey = "this_month" | "last_month" | "90d";

/**
 * Ranges are resolved at render time rather than stored, so a session left open
 * across midnight UTC still asks for the current day.
 */
function resolveRange(key: RangeKey): { start: string; end: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  switch (key) {
    case "last_month":
      return { start: utcDate(new Date(Date.UTC(y, m - 1, 1))), end: utcDate(new Date(Date.UTC(y, m, 0))) };
    case "90d":
      return { start: utcDate(new Date(Date.UTC(y, m, now.getUTCDate() - 89))), end: utcDate(now) };
    default:
      return { start: utcDate(new Date(Date.UTC(y, m, 1))), end: utcDate(new Date(Date.UTC(y, m + 1, 0))) };
  }
}

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "90d", label: "90 days" },
];

/**
 * Monthly transfer usage against the plan's allowance, plus the day-by-day
 * inbound/outbound breakdown.
 *
 * Only outbound counts against `transfer_gb`; exceeding it has no automatic
 * effect today, so an over-quota bar is informational, not an incident.
 */
export function VmTrafficPanel({ vmId, summary }: VmTrafficPanelProps) {
  const adminApi = useAdminApi();
  const [range, setRange] = useState<RangeKey>("this_month");
  const { start, end } = resolveRange(range);
  const { data, loading, error, retry } = useApiCall(() => adminApi.getVmTraffic(vmId, { start, end }), [vmId, range]);

  // The fetched summary always describes the current month, so prefer it once
  // loaded and fall back to whatever the VM response carried.
  const usage = data?.summary ?? summary;
  const quotaBytes = usage?.transfer_gb != null ? usage.transfer_gb * TRANSFER_GB_BYTES : null;
  const usedPct = usage && quotaBytes && quotaBytes > 0 ? (usage.bytes_out / quotaBytes) * 100 : null;

  const days = useMemo(
    () =>
      (data?.days ?? []).map((d) => ({
        ...d,
        label: d.day.slice(5), // MM-DD; the year is implied by the range
      })),
    [data],
  );

  const rangeTotals = useMemo(
    () =>
      days.reduce((acc, d) => ({ bytes_in: acc.bytes_in + d.bytes_in, bytes_out: acc.bytes_out + d.bytes_out }), {
        bytes_in: 0,
        bytes_out: 0,
      }),
    [days],
  );

  let chart: React.ReactNode;
  if (loading) {
    chart = <div className="py-6 text-sm text-gray-400">Loading traffic…</div>;
  } else if (error) {
    chart = (
      <div className="py-6 text-sm text-red-400">
        {error.message}{" "}
        <button type="button" onClick={retry} className="underline hover:text-red-300">
          Retry
        </button>
      </div>
    );
  } else if (days.length === 0) {
    chart = <div className="py-6 text-center text-sm text-gray-500">No traffic recorded in this range.</div>;
  } else {
    chart = (
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={days} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="label" stroke="#9CA3AF" fontSize={11} minTickGap={24} />
            <YAxis stroke="#9CA3AF" fontSize={11} width={72} tickFormatter={(v: number) => formatTransferBytes(v, 0)} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1F2937",
                border: "1px solid #374151",
                borderRadius: "6px",
                color: "#F9FAFB",
              }}
              formatter={(value: number, name: string) => [
                formatTransferBytes(value),
                name === "bytes_out" ? "Out" : "In",
              ]}
            />
            <Legend
              formatter={(name: string) => (name === "bytes_out" ? "Out" : "In")}
              wrapperStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="bytes_out" stackId="a" fill="#38BDF8" />
            <Bar dataKey="bytes_in" stackId="a" fill="#34D399" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-slate-700 rounded-lg p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-white">Network Transfer</h3>
        <div className="inline-flex rounded-md border border-slate-700 bg-slate-800/60 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                range === r.key ? "bg-slate-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {usage && (
        <div className="mb-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
            <span className="text-gray-400">
              This month ({usage.period_start} → {usage.period_end})
            </span>
            <span className="text-white">
              {formatTransferBytes(usage.bytes_out)} out
              {quotaBytes != null ? (
                <span className="text-gray-400"> of {formatTransferBytes(quotaBytes, 0)}</span>
              ) : (
                <span className="text-gray-400"> · unmetered</span>
              )}
              <span className="text-gray-500"> · {formatTransferBytes(usage.bytes_in)} in</span>
            </span>
          </div>
          {usedPct != null && (
            <div className="mt-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
                <div
                  className={`h-full rounded-full ${
                    usedPct >= 100 ? "bg-red-500" : usedPct >= 80 ? "bg-amber-400" : "bg-sky-400"
                  }`}
                  style={{ width: `${Math.min(usedPct, 100)}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-gray-400">
                {usedPct.toFixed(1)}% of the monthly outbound allowance used
                {usedPct >= 100 && <span className="text-red-400"> — over allowance (not enforced)</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {days.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-400">
          <span>
            Range out: <span className="text-white">{formatTransferBytes(rangeTotals.bytes_out)}</span>
          </span>
          <span>
            Range in: <span className="text-white">{formatTransferBytes(rangeTotals.bytes_in)}</span>
          </span>
        </div>
      )}

      {chart}
    </div>
  );
}
