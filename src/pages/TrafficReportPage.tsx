import { ArrowDownTrayIcon, SignalIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { PaginatedTable } from "../components/PaginatedTable";
import { Profile } from "../components/Profile";
import { StatsHeader } from "../components/StatsHeader";
import { useAdminApi } from "../hooks/useAdminApi";
import type { AdminApi, AdminVmInfo, FleetTrafficRow } from "../lib/api";
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
 * The report returns bare ids, so each row is enriched with the VM it belongs
 * to. Cached for the life of the page: paging back and forth over a ranking
 * that only moves once a day should not re-fetch the same VMs.
 */
const vmCache = new Map<number, AdminVmInfo | null>();

/** Resolve `ids` through the cache, at most `concurrency` requests in flight. */
async function loadVms(api: AdminApi, ids: number[], concurrency = 6): Promise<void> {
  const missing = ids.filter((id) => !vmCache.has(id));
  for (let i = 0; i < missing.length; i += concurrency) {
    await Promise.all(
      missing.slice(i, i + concurrency).map(async (id) => {
        try {
          vmCache.set(id, await api.getVM(id));
        } catch {
          // A VM the report can still attribute but the detail endpoint refuses
          // (permission, race with a purge) must not blank the whole page.
          vmCache.set(id, null);
        }
      }),
    );
  }
}

interface EnrichedRow extends FleetTrafficRow {
  vm: AdminVmInfo | null;
  /** 1-based position in the whole ranking, not just this page. */
  rank: number;
}

/**
 * Fleet traffic ranking — which VMs moved the transit bill, heaviest outbound
 * sender first, defaulting to the current calendar month.
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

  const loadPage = async (params: { limit: number; offset: number }) => {
    const page = await adminApi.getTrafficReport({ ...params, ...applied });
    await loadVms(
      adminApi,
      page.data.map((r) => r.vm_id),
    );
    return {
      ...page,
      data: page.data.map((row, i) => ({
        ...row,
        vm: vmCache.get(row.vm_id) ?? null,
        rank: params.offset + i + 1,
      })),
    };
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
    // Name the rows that were never paged into view, so the export is not a
    // column of bare ids.
    await loadVms(
      adminApi,
      rows.map((r) => r.vm_id),
    );
    const csv = [
      ["VM ID", "VM Name", "User ID", "User Pubkey", "Bytes Out", "Bytes In"].join(","),
      ...rows.map((r) => {
        const vm = vmCache.get(r.vm_id) ?? null;
        return [
          r.vm_id,
          vm ? `"${vmLabel(vm).replace(/"/g, '""')}"` : "",
          r.user_id,
          vm?.user_pubkey ?? "",
          r.bytes_out,
          r.bytes_in,
        ].join(",");
      }),
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
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">#</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">VM</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Owner</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Location</th>
      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Out</th>
      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">In</th>
    </tr>
  );

  const renderRow = (row: EnrichedRow) => {
    const vm = row.vm;
    return (
      <tr key={row.vm_id} className="hover:bg-gray-700/40">
        <td className="px-4 py-3 text-sm text-gray-500">{row.rank}</td>
        <td className="px-4 py-3">
          <Link to={`/vms/${row.vm_id}`} className="text-blue-400 hover:underline">
            {vm ? vmLabel(vm) : `VM ${row.vm_id}`}
          </Link>
          <div className="text-xs text-gray-500">
            #{row.vm_id}
            {vm?.deleted && <span className="ml-2 text-red-400">deleted</span>}
          </div>
        </td>
        <td className="px-4 py-3">
          <Link to={`/users/${row.user_id}`} className="text-blue-400 hover:text-blue-300">
            {vm ? (
              <Profile pubkey={vm.user_pubkey} avatarSize="sm" />
            ) : (
              <span className="hover:underline">Account</span>
            )}
          </Link>
          {vm?.user_email && <div className="mt-1 text-xs text-gray-500">{vm.user_email}</div>}
        </td>
        <td className="px-4 py-3 text-sm text-gray-300">
          {vm ? (
            <>
              <div>{vm.region_name}</div>
              <div className="text-xs text-gray-500">{vm.host_name}</div>
            </>
          ) : (
            <span className="text-gray-600">—</span>
          )}
        </td>
        <td className="px-4 py-3 text-right text-white">{formatTransferBytes(row.bytes_out)}</td>
        <td className="px-4 py-3 text-right text-gray-300">{formatTransferBytes(row.bytes_in)}</td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      <StatsHeader
        title="Fleet Traffic"
        subtitle="VMs ranked by outbound transfer over the selected UTC date range"
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

      <PaginatedTable<EnrichedRow>
        apiCall={loadPage}
        renderHeader={renderHeader}
        renderRow={renderRow}
        renderEmptyState={() => (
          <div className="py-10 text-center text-gray-400">
            <SignalIcon className="mx-auto mb-2 h-8 w-8" />
            No traffic recorded in this range.
          </div>
        )}
        itemsPerPage={25}
        errorAction="load traffic report"
        loadingMessage="Loading traffic report..."
        dependencies={[applied]}
        minWidth="900px"
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

/** Human label for a VM: the image and plan it runs, not its row id. */
function vmLabel(vm: AdminVmInfo): string {
  const parts = [vm.image_name, vm.template_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : `VM ${vm.id}`;
}
