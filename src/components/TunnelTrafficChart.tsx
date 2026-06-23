import type React from "react";
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAdminApi } from "../hooks/useAdminApi";
import { useApiCall } from "../hooks/useApiCall";

// Network bandwidth is conventionally expressed in bits/sec with SI (base-1000)
// units, so convert the byte-rate (×8) and scale by powers of 1000.
function formatBitsPerSec(bytesPerSec: number): string {
  const bits = bytesPerSec * 8;
  if (bits < 1) return "0 bps";
  const units = ["bps", "Kbps", "Mbps", "Gbps", "Tbps"];
  const i = Math.min(Math.floor(Math.log10(bits) / 3), units.length - 1);
  const value = bits / 1000 ** i;
  const formatted = value >= 100 || value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
  return `${formatted} ${units[i]}`;
}

interface TunnelTrafficChartProps {
  routerId: number;
  tunnelName: string;
}

// Selectable time windows. `hours` is the lookback used to compute the `from`
// query param (the API defaults to 24h when none is given).
const RANGES = [
  { key: "1h", label: "1h", hours: 1 },
  { key: "6h", label: "6h", hours: 6 },
  { key: "24h", label: "24h", hours: 24 },
  { key: "7d", label: "7d", hours: 24 * 7 },
  { key: "30d", label: "30d", hours: 24 * 30 },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

interface ThroughputPoint {
  t: number; // epoch ms
  label: string;
  rx: number; // bytes/sec
  tx: number; // bytes/sec
}

/**
 * Tunnel traffic over a selectable time window. The API returns cumulative
 * interface byte counters sampled ~every 60s, so we derive per-interval
 * throughput (delta bytes / delta seconds). Counter resets (negative deltas)
 * are dropped.
 */
export function TunnelTrafficChart({ routerId, tunnelName }: TunnelTrafficChartProps) {
  const adminApi = useAdminApi();
  const [range, setRange] = useState<RangeKey>("24h");
  const hours = RANGES.find((r) => r.key === range)?.hours ?? 24;
  const { data, loading, error, retry } = useApiCall(
    () =>
      adminApi.getTunnelTraffic(routerId, tunnelName, {
        from: new Date(Date.now() - hours * 3600 * 1000).toISOString(),
        to: new Date().toISOString(),
      }),
    [routerId, tunnelName, range],
  );

  const points = useMemo<ThroughputPoint[]>(() => {
    if (!data || data.length < 2) return [];
    // For windows longer than a day, include the date in axis/tooltip labels.
    const showDate = hours > 24;
    const sorted = [...data].sort((a, b) => new Date(a.sampled_at).getTime() - new Date(b.sampled_at).getTime());
    const out: ThroughputPoint[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const cur = sorted[i];
      const dt = (new Date(cur.sampled_at).getTime() - new Date(prev.sampled_at).getTime()) / 1000;
      if (dt <= 0) continue;
      const dRx = cur.rx_bytes - prev.rx_bytes;
      const dTx = cur.tx_bytes - prev.tx_bytes;
      // Skip counter resets (interface restart / wrap) rather than spike the chart.
      if (dRx < 0 || dTx < 0) continue;
      const ts = new Date(cur.sampled_at);
      const time = ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const label = showDate ? `${ts.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}` : time;
      out.push({
        t: ts.getTime(),
        label,
        rx: dRx / dt,
        tx: dTx / dt,
      });
    }
    return out;
  }, [data, hours]);

  const peak = useMemo(() => {
    if (points.length === 0) return { rx: 0, tx: 0 };
    return {
      rx: Math.max(...points.map((p) => p.rx)),
      tx: Math.max(...points.map((p) => p.tx)),
    };
  }, [points]);

  const rangeSelector = (
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
  );

  let body: React.ReactNode;
  if (loading) {
    body = <div className="py-6 text-sm text-gray-400">Loading traffic…</div>;
  } else if (error) {
    body = (
      <div className="py-6 text-sm text-red-400">
        {error.message}{" "}
        <button type="button" onClick={retry} className="underline hover:text-red-300">
          Retry
        </button>
      </div>
    );
  } else if (points.length === 0) {
    body = (
      <div className="py-6 text-center text-sm text-slate-400">
        Not enough traffic samples in this window to chart throughput (need at least two).
      </div>
    );
  } else {
    body = (
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="label" stroke="#9CA3AF" fontSize={11} minTickGap={32} />
            <YAxis stroke="#9CA3AF" fontSize={11} width={72} tickFormatter={(v: number) => formatBitsPerSec(v)} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1F2937",
                border: "1px solid #374151",
                borderRadius: "6px",
                color: "#F9FAFB",
              }}
              labelFormatter={(label) => `Time ${label}`}
              formatter={(value: number, name: string) => [formatBitsPerSec(value), name === "rx" ? "Rx" : "Tx"]}
            />
            <Line type="monotone" dataKey="rx" stroke="#34D399" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="tx" stroke="#38BDF8" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
          <span className="font-medium text-gray-300">Throughput</span>
          <span className="flex items-center gap-1.5 text-gray-400">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            Rx peak {formatBitsPerSec(peak.rx)}
          </span>
          <span className="flex items-center gap-1.5 text-gray-400">
            <span className="inline-block h-2 w-2 rounded-full bg-sky-400" />
            Tx peak {formatBitsPerSec(peak.tx)}
          </span>
        </div>
        {rangeSelector}
      </div>
      {body}
    </div>
  );
}
