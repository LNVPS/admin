import { DocumentTextIcon } from "@heroicons/react/24/outline";
import type React from "react";
import { Link } from "react-router-dom";
import type { AdminVmInfo } from "../lib/api";
import { formatBytes } from "../utils/formatBytes";
import { Profile } from "./Profile";
import { StatusBadge } from "./StatusBadge";
import { VmStatusBadge } from "./VmStatusBadge";

/**
 * The VM list row, shared by every table that lists VMs so a VM reads the same
 * everywhere: id, host · region · IPs, status + resources, owner + dates.
 *
 * `trailing` adds report-specific cells (e.g. transfer volumes) between the
 * owner and the actions; `actions` is omitted entirely on read-only tables,
 * in which case the header must be built with `actions: false` to match.
 */
export function vmListHeaderCells(opts?: { trailing?: React.ReactNode; actions?: boolean }) {
  return (
    <>
      <th className="w-14">ID</th>
      <th>Host &amp; Network</th>
      <th>Status</th>
      <th>Owner</th>
      {opts?.trailing}
      {opts?.actions !== false && <th className="text-right">Actions</th>}
    </>
  );
}

interface VmListRowProps {
  vm: AdminVmInfo;
  /** Extra `<td>`s rendered after the owner column. */
  trailing?: React.ReactNode;
  /** Contents of the trailing actions cell. Omit for a read-only table. */
  actions?: React.ReactNode;
}

export function VmListRow({ vm, trailing, actions }: VmListRowProps) {
  return (
    <tr className={vm.deleted ? "bg-gray-800/50 opacity-75" : ""}>
      <td className="whitespace-nowrap align-top">
        <Link to={`/vms/${vm.id}`} className="text-blue-400 hover:text-blue-300 font-semibold">
          #{vm.id}
        </Link>
      </td>
      {/* Host · region / IPs */}
      <td className="align-top">
        <div className="min-w-0 max-w-[22rem]">
          <div className="truncate text-slate-100">
            {vm.host_name && <span className="font-medium">{vm.host_name}</span>}
            {vm.host_name && <span className="text-slate-500"> · </span>}
            <span className="text-slate-400">{vm.region_name || "Unknown region"}</span>
          </div>
          <div className="mt-1 space-y-0.5">
            {vm.ip_addresses.length > 0 ? (
              vm.ip_addresses.map((ip) => (
                <div key={ip.id} className="truncate font-mono text-xs text-slate-300" title={ip.ip}>
                  {ip.ip}
                </div>
              ))
            ) : (
              <span className="text-xs text-slate-500">No IPs</span>
            )}
          </div>
        </div>
      </td>
      {/* Status + resources */}
      <td className="align-top">
        <div className="flex flex-wrap items-center gap-1.5">
          <VmStatusBadge vm={vm} />
          {vm.disabled && <StatusBadge status="disabled" />}
          {vm.admin_notes && (
            <span
              title={`Admin notes: ${vm.admin_notes}`}
              className="text-slate-400"
              role="img"
              aria-label="Has admin notes"
            >
              <DocumentTextIcon className="h-4 w-4" />
            </span>
          )}
        </div>
        {vm.cpu !== undefined && vm.memory !== undefined && vm.disk_size !== undefined ? (
          <div className="mt-1.5 font-mono text-xs text-slate-300">
            {vm.cpu}C · {formatBytes(vm.memory)} · {formatBytes(vm.disk_size)}{" "}
            <span className="uppercase text-slate-500">{vm.disk_type}</span>
          </div>
        ) : (
          <div className="mt-1.5 text-xs text-slate-500">No resource info</div>
        )}
      </td>
      {/* Owner + dates */}
      <td className="align-top">
        {vm.user_id ? (
          <Link to={`/users/${vm.user_id}`} className="text-blue-400 hover:text-blue-300" state={{ user: undefined }}>
            <Profile pubkey={vm.user_pubkey || ""} avatarSize="sm" />
          </Link>
        ) : (
          <span className="text-slate-400">N/A</span>
        )}
        <div className="mt-1 text-xs text-slate-400">
          Created {new Date(vm.created).toLocaleDateString()}
          {vm.expires && new Date(vm.expires) < new Date() && (
            <span className="ml-2 font-semibold text-red-400">Expired</span>
          )}
        </div>
      </td>
      {trailing}
      {actions !== undefined && (
        <td className="text-right align-top">
          <div className="flex justify-end space-x-2">{actions}</div>
        </td>
      )}
    </tr>
  );
}
