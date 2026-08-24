import { ArrowDownTrayIcon, SignalIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { PaginatedTable } from "../components/PaginatedTable";
import { StatsHeader } from "../components/StatsHeader";
import { useAdminApi } from "../hooks/useAdminApi";
import type { FleetTrafficRow } from "../lib/api";
import { formatTransferBytes } from "../utils/formatBytes";

/** Inclusive UTC date bound in the API's YYYY-MM-DD form. */
function utcDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function currentMonth(): { start: string; end: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  return { start: utcDate(new Date(Date.UTC(y, m, 1))), end: utcDate(new Date(Date.UTC(y, m + 1, 0))) };
}

const MAX_RANGE_DAYS = 400;

/**
 * Fleet traffic ranking — which VMs moved the transit bill, heaviest outbound
 * sender first.
 *
 * Figures are the hypervisor's per-VM interface counters, so they cover all
 * egress from the guest, not only billable internet egress. VMs purged since
 * the range are not reported.
 */
export function TrafficReportPage() {
  const adminApi = useAdminApi();
  const initial = currentMonth();
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  // Only applied bounds drive the query, so a half-typed date never fires a request.
  const [applied, setApplied] = useState(initial);
  const [rangeError, setRangeError] = useState<string | null>(null);

  const applyRange = () => {
    const startMs = Date.parse(`${start}T00:00:00Z`);
    const endMs = Date.parse(`${end}T00:00:00Z`);
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      setRangeError("Enter both a start and an end date.");
      return;
    }
    if (endMs < startMs) {
      setRangeError("End date must not be before the start date.");
      return;
    }
    if ((endMs - startMs) / 86_400_000 + 1 > MAX_RANGE_DAYS) {
      setRangeError(`Range may span at most ${MAX_RANGE_DAYS} days.`);
      return;
    }
    setRangeError(null);
    setApplied({ start, end });
  };

  const exportCSV = async () => {
    // Export the whole ranking, not just the visible page.
    const rows: FleetTrafficRow[] = [];
    let offset = 0;
    for (;;) {
      const page = await adminApi.getTrafficReport({ ...applied, limit: 100, offset });
      rows.push(...page.data);
      offset += page.data.length;
      if (page.data.length === 0 || offset >= page.total) break;
    }
    const csv = [
      ["VM ID", "User ID", "Bytes Out", "Bytes In"].join(","),
      ...rows.map((r) => [r.vm_id, r.user_id, r.bytes_out, r.bytes_in].join(",")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `traffic-${applied.start}_${applied.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderHeader = () => (
    <tr>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">VM</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Out</th>
      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">In</th>
    </tr>
  );

  const renderRow = (row: FleetTrafficRow) => (
    <tr key={row.vm_id} className="hover:bg-gray-700/40">
      <td className="px-4 py-3">
        <Link to={`/vms/${row.vm_id}`} className="text-blue-400 hover:underline">
          VM #{row.vm_id}
        </Link>
      </td>
      <td className="px-4 py-3">
        <Link to={`/users/${row.user_id}`} className="text-blue-400 hover:underline">
          User #{row.user_id}
        </Link>
      </td>
      <td className="px-4 py-3 text-right text-white">{formatTransferBytes(row.bytes_out)}</td>
      <td className="px-4 py-3 text-right text-gray-300">{formatTransferBytes(row.bytes_in)}</td>
    </tr>
  );

  return (
    <div className="space-y-6">
      <StatsHeader
        title="Fleet Traffic"
        subtitle="VMs ranked by outbound transfer over the selected UTC date range"
        stats={[]}
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label htmlFor="traffic-start" className="block text-xs text-gray-400 mb-1">
                Start
              </label>
              <input
                id="traffic-start"
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
              />
            </div>
            <div>
              <label htmlFor="traffic-end" className="block text-xs text-gray-400 mb-1">
                End
              </label>
              <input
                id="traffic-end"
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
              />
            </div>
            <Button variant="secondary" onClick={applyRange}>
              Apply
            </Button>
            <Button variant="secondary" onClick={exportCSV} className="flex items-center gap-2">
              <ArrowDownTrayIcon className="h-4 w-4" />
              CSV
            </Button>
          </div>
        }
      />

      {rangeError && <div className="text-sm text-red-400">{rangeError}</div>}

      <PaginatedTable<FleetTrafficRow>
        apiCall={(params) => adminApi.getTrafficReport({ ...params, ...applied })}
        renderHeader={renderHeader}
        renderRow={renderRow}
        renderEmptyState={() => (
          <div className="py-10 text-center text-gray-400">
            <SignalIcon className="mx-auto mb-2 h-8 w-8" />
            No traffic recorded in this range.
          </div>
        )}
        itemsPerPage={50}
        errorAction="load traffic report"
        loadingMessage="Loading traffic report..."
        dependencies={[applied]}
        minWidth="600px"
        calculateStats={(rows, total) => (
          <div className="flex flex-wrap gap-4 text-sm text-gray-400">
            <span>
              VMs with traffic: <span className="text-white font-medium">{total}</span>
            </span>
            <span>
              Page out total:{" "}
              <span className="text-white font-medium">
                {formatTransferBytes(rows.reduce((a, r) => a + r.bytes_out, 0))}
              </span>
            </span>
          </div>
        )}
      />
    </div>
  );
}
