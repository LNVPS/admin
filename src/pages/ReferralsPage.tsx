import {
  ArrowPathIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  ServerIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { Link } from "react-router-dom";
import { PaginatedTable } from "../components/PaginatedTable";
import { useAdminApi } from "../hooks/useAdminApi";
import type { AdminVmInfo } from "../lib/api";
import { formatBytes } from "../utils/formatBytes";

export function ReferralsPage() {
  const api = useAdminApi();
  const [refCodeFilter, setRefCodeFilter] = useState("");
  const [appliedFilter, setAppliedFilter] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSearch = () => {
    setAppliedFilter(refCodeFilter.trim());
  };

  const handleClear = () => {
    setRefCodeFilter("");
    setAppliedFilter("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Fetch all VMs with a ref_code set (we filter client-side since there's no server-side ref_code filter)
  // The API doesn't support filtering by ref_code, so we use include_deleted=false and filter the response
  const fetchFilteredReferrals = async ({ limit, offset }: { limit: number; offset: number }) => {
    if (!appliedFilter) {
      // No filter: fetch all VMs and only return those with a ref_code
      // We do a larger batch and filter; for production this would need a dedicated endpoint
      const result = await api.getVMs({ limit: 100, offset, include_deleted: false });
      const withRefCode = result.data.filter((vm) => vm.ref_code);
      return {
        ...result,
        data: withRefCode.slice(0, limit),
        total: withRefCode.length,
      };
    }
    // With filter: fetch a batch and filter by code
    const result = await api.getVMs({ limit: 100, offset, include_deleted: false });
    const filtered = result.data.filter((vm) => vm.ref_code?.toLowerCase() === appliedFilter.toLowerCase());
    return {
      ...result,
      data: filtered.slice(0, limit),
      total: filtered.length,
    };
  };

  const renderStats = (items: AdminVmInfo[], total: number) => {
    const uniqueCodes = new Set(items.map((vm) => vm.ref_code).filter(Boolean)).size;
    const uniqueRegions = new Set(items.map((vm) => vm.region_name)).size;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 rounded-lg p-4 flex items-center gap-3">
          <ServerIcon className="h-8 w-8 text-blue-500 shrink-0" />
          <div>
            <p className="text-gray-400 text-sm">Referred VMs (page)</p>
            <p className="text-white font-semibold text-lg">{items.length}</p>
            <p className="text-blue-400 text-xs">of {total} total</p>
          </div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 flex items-center gap-3">
          <UserGroupIcon className="h-8 w-8 text-green-500 shrink-0" />
          <div>
            <p className="text-gray-400 text-sm">Unique Ref Codes</p>
            <p className="text-white font-semibold text-lg">{uniqueCodes}</p>
            <p className="text-green-400 text-xs">on this page</p>
          </div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 flex items-center gap-3">
          <ChartBarIcon className="h-8 w-8 text-purple-500 shrink-0" />
          <div>
            <p className="text-gray-400 text-sm">Regions</p>
            <p className="text-white font-semibold text-lg">{uniqueRegions}</p>
            <p className="text-purple-400 text-xs">on this page</p>
          </div>
        </div>
      </div>
    );
  };

  const renderHeader = () => (
    <>
      <th>VM ID</th>
      <th>Ref Code</th>
      <th>User</th>
      <th>Region</th>
      <th>Template</th>
      <th>IP Addresses</th>
      <th>CPU / RAM / Disk</th>
      <th>Created</th>
      <th>Expires</th>
    </>
  );

  const renderRow = (vm: AdminVmInfo) => (
    <tr key={vm.id}>
      <td>
        <Link to={`/vms/${vm.id}`} className="text-blue-400 hover:text-blue-300 font-mono">
          #{vm.id}
        </Link>
      </td>
      <td>
        <span className="bg-blue-900 text-blue-200 px-2 py-0.5 rounded text-xs font-mono font-semibold">
          {vm.ref_code}
        </span>
      </td>
      <td>
        <Link to={`/users/${vm.user_id}`} className="text-blue-400 hover:text-blue-300">
          <span className="font-mono text-xs">{vm.user_pubkey.slice(0, 12)}…</span>
          {vm.user_email && <span className="block text-gray-400 text-xs">{vm.user_email}</span>}
        </Link>
      </td>
      <td>
        <span className="text-gray-300">{vm.region_name}</span>
      </td>
      <td>
        <span className="text-gray-300">{vm.template_name}</span>
      </td>
      <td>
        <div className="space-y-0.5">
          {vm.ip_addresses.map((ip) => (
            <div key={ip.id} className="font-mono text-xs text-gray-300">
              {ip.ip}
            </div>
          ))}
        </div>
      </td>
      <td>
        <span className="text-gray-300 text-xs">
          {vm.cpu}c / {formatBytes(vm.memory)} / {formatBytes(vm.disk_size)}
        </span>
      </td>
      <td>
        <span className="text-gray-300 text-xs">{new Date(vm.created).toLocaleDateString()}</span>
      </td>
      <td>
        <span className="text-gray-300 text-xs">{new Date(vm.expires).toLocaleDateString()}</span>
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserGroupIcon className="h-8 w-8 text-blue-500" />
          <h1 className="text-2xl font-bold text-white">Referrals Management</h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </button>
          <Link
            to="/referrals-report"
            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
          >
            <ChartBarIcon className="h-4 w-4" />
            View Report
          </Link>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-slate-800 rounded-lg p-4">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label htmlFor="ref-code-filter" className="block text-sm font-medium text-gray-300 mb-1">
              Filter by Referral Code
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                id="ref-code-filter"
                type="text"
                value={refCodeFilter}
                onChange={(e) => setRefCodeFilter(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. PROMO2025"
                className="w-full pl-9 pr-9 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none text-sm"
              />
              {refCodeFilter && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
          >
            Search
          </button>
          {appliedFilter && (
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        {appliedFilter && (
          <p className="mt-2 text-sm text-blue-400">
            Filtering by ref code: <span className="font-mono font-semibold">{appliedFilter}</span>
          </p>
        )}
      </div>

      <PaginatedTable<AdminVmInfo>
        apiCall={fetchFilteredReferrals}
        renderHeader={renderHeader}
        renderRow={renderRow}
        errorAction="load referral data"
        loadingMessage="Loading referred VMs..."
        dependencies={[appliedFilter, refreshKey]}
        calculateStats={renderStats}
        minWidth="900px"
        renderEmptyState={() => (
          <div className="text-center py-8">
            <UserGroupIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-lg">No referred VMs found</p>
            {appliedFilter ? (
              <p className="text-gray-500 text-sm mt-1">No VMs found with referral code "{appliedFilter}"</p>
            ) : (
              <p className="text-gray-500 text-sm mt-1">No VMs have been created with a referral code</p>
            )}
          </div>
        )}
      />
    </div>
  );
}
