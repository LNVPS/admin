import { ArrowDownTrayIcon, SignalIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { PaginatedTable } from "../components/PaginatedTable";
import { StatsHeader } from "../components/StatsHeader";
import { VmListRow, vmListHeaderCells } from "../components/VmListRow";
import { useAdminApi } from "../hooks/useAdminApi";
import type { AdminApi, AdminVmInfo, FleetTrafficRow } from "../lib/api";
import { formatTransferBytes, TRANSFER_GB_BYTES } from "../utils/formatBytes";

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

/** Ids per bulk-status request; the endpoint rejects more than 100. */
const BULK_VM_STATUS_MAX_IDS = 100;

/**
 * The report returns bare ids, so each row is enriched with the VM it belongs
 * to and rendered as the ordinary VM list row.
 *
 * Ids that no longer resolve are omitted from the response, so the result is
 * keyed by `id` rather than matched by position.
 */
async function loadVms(api: AdminApi, ids: number[]): Promise<Map<number, AdminVmInfo>> {
  const unique = [...new Set(ids)];
  const out = new Map<number, AdminVmInfo>();
  for (let i = 0; i < unique.length; i += BULK_VM_STATUS_MAX_IDS) {
    const vms = await api.getVmStatuses(unique.slice(i, i + BULK_VM_STATUS_MAX_IDS));
    for (const vm of vms) out.set(vm.id, vm);
  }
  return out;
}

interface EnrichedRow extends FleetTrafficRow {
  vm: AdminVmInfo | null;
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
    const vms = await loadVms(
      adminApi,
      page.data.map((r) => r.vm_id),
    );
    return {
      ...page,
      data: page.data.map((row) => ({ ...row, vm: vms.get(row.vm_id) ?? null })),
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
    const vms = await loadVms(
      adminApi,
      rows.map((r) => r.vm_id),
    );
    const csv = [
      ["VM ID", "Host", "Region", "Plan", "User ID", "User Pubkey", "Bytes Out", "Bytes In"].join(","),
      ...rows.map((r) => {
        const vm = vms.get(r.vm_id) ?? null;
        return [
          r.vm_id,
          vm?.host_name ?? "",
          vm?.region_name ?? "",
          vm ? `"${(vm.template_name ?? "").replace(/"/g, '""')}"` : "",
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

  // PaginatedTable owns the <tr>, so the header is a bare list of <th> cells.
  const renderHeader = () =>
    vmListHeaderCells({
      trailing: <th className="!text-right">Transfer</th>,
      actions: false,
    });

  // The allowance is a calendar-month figure, so a percentage is only
  // meaningful while the selected range is that month.
  const month = currentMonth();
  const showQuota = applied.start === month.start && applied.end === month.end;

  const renderTransferCell = (row: EnrichedRow) => {
    const quotaGb = showQuota ? row.vm?.traffic?.transfer_gb : null;
    const quotaBytes = quotaGb != null ? quotaGb * TRANSFER_GB_BYTES : null;
    const pct = quotaBytes && quotaBytes > 0 ? (row.bytes_out / quotaBytes) * 100 : null;
    return (
      <td className="whitespace-nowrap text-right align-top">
        <div className="font-mono text-slate-100">↑ {formatTransferBytes(row.bytes_out)}</div>
        <div className="font-mono text-xs text-slate-400">↓ {formatTransferBytes(row.bytes_in)}</div>
        {pct != null && (
          <div className={`text-xs ${pct >= 100 ? "text-red-400" : pct >= 80 ? "text-amber-400" : "text-slate-500"}`}>
            {pct.toFixed(0)}% of {quotaGb} GB
          </div>
        )}
      </td>
    );
  };

  const renderRow = (row: EnrichedRow) => {
    if (!row.vm) {
      // Unresolvable VM: keep the column count so the table stays aligned.
      return (
        <tr key={row.vm_id}>
          <td className="whitespace-nowrap align-top">
            <Link to={`/vms/${row.vm_id}`} className="font-semibold text-blue-400 hover:text-blue-300">
              #{row.vm_id}
            </Link>
          </td>
          <td className="align-top text-slate-500">Details unavailable</td>
          <td className="align-top text-slate-500">—</td>
          <td className="align-top">
            <Link to={`/users/${row.user_id}`} className="text-blue-400 hover:text-blue-300">
              Account
            </Link>
          </td>
          {renderTransferCell(row)}
        </tr>
      );
    }
    return <VmListRow key={row.vm_id} vm={row.vm} trailing={renderTransferCell(row)} />;
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
        minWidth="1000px"
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
