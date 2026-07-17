import {
  ArrowPathIcon,
  ChartBarIcon,
  GiftIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PaginatedTable } from "../components/PaginatedTable";
import { Profile } from "../components/Profile";
import { StatsHeader } from "../components/StatsHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useAdminApi } from "../hooks/useAdminApi";
import { useUserRoles } from "../hooks/useUserRoles";
import type { AdminReferralInfo, AdminVmInfo, ReferralMode } from "../lib/api";
import { formatBytes } from "../utils/formatBytes";

const MODE_LABELS: Record<ReferralMode, string> = {
  lightning_address: "Lightning Address",
  nwc: "Nostr Wallet Connect",
  account_credit: "Account Credit",
};

type TabId = "referrers" | "vms";

export function ReferralProgramPage() {
  const { hasPermission } = useUserRoles();
  const [searchParams, setSearchParams] = useSearchParams();

  const canViewReferrers = hasPermission("referral::view");
  const canViewVms = hasPermission("virtual_machines::view");

  const tabs: { id: TabId; label: string }[] = [
    ...(canViewReferrers ? [{ id: "referrers" as const, label: "Referrers" }] : []),
    ...(canViewVms ? [{ id: "vms" as const, label: "Referred VMs" }] : []),
  ];

  const paramTab = searchParams.get("tab") as TabId | null;
  const initialTab: TabId = tabs.find((t) => t.id === paramTab)?.id ?? tabs[0]?.id ?? "referrers";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", tab);
        return next;
      },
      { replace: true },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <GiftIcon className="h-8 w-8 text-blue-500" />
        <h1 className="text-2xl font-bold text-white">Referral Program</h1>
      </div>

      {/* Tab bar */}
      <div className="border-b border-slate-700">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={clsx(
                "border-b-2 px-1 pb-3 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-200",
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "referrers" && canViewReferrers && <ReferrersTab />}
      {activeTab === "vms" && canViewVms && <ReferredVmsTab />}
    </div>
  );
}

/** Tab: referral enrollments (referrers) with commission rate + payout mode. */
function ReferrersTab() {
  const api = useAdminApi();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  const [appliedSearch, setAppliedSearch] = useState(searchParams.get("search") ?? "");

  // Debounce the free-text search (referral code substring or 64-char hex pubkey).
  useEffect(() => {
    const handle = setTimeout(() => {
      const next = searchInput.trim();
      setAppliedSearch(next);
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (next) params.set("search", next);
          else params.delete("search");
          return params;
        },
        { replace: true },
      );
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const renderStats = (items: AdminReferralInfo[], total: number) => {
    const withOverride = items.filter((r) => r.referral_rate != null).length;
    return (
      <StatsHeader
        stats={[
          { label: "Referrers (page)", value: `${items.length} of ${total}` },
          { label: "With Rate Override", value: withOverride, tone: "success" },
        ]}
      />
    );
  };

  const renderHeader = () => (
    <>
      <th>Code</th>
      <th>Referrer</th>
      <th>Payout Mode</th>
      <th>Commission Rate</th>
      <th>Created</th>
    </>
  );

  const renderRow = (referral: AdminReferralInfo) => (
    <tr
      key={referral.id}
      onClick={() => navigate(`/referral-program/${referral.id}`)}
      className="cursor-pointer hover:bg-slate-800/50"
    >
      <td className="align-top">
        <Link
          to={`/referral-program/${referral.id}`}
          onClick={(e) => e.stopPropagation()}
          className="rounded bg-blue-900 px-2 py-0.5 font-mono text-xs font-semibold text-blue-200 hover:bg-blue-800"
        >
          {referral.code}
        </Link>
      </td>
      <td className="align-top">
        <div onClick={(e) => e.stopPropagation()} className="max-w-[16rem]">
          <Profile pubkey={referral.user_pubkey} avatarSize="sm" />
          <Link to={`/users/${referral.user_id}`} className="text-xs text-blue-400 hover:text-blue-300">
            User #{referral.user_id}
          </Link>
        </div>
      </td>
      <td className="align-top">
        <StatusBadge status="unknown" colorOverride="border border-blue-500/40 bg-blue-500/10 text-blue-400">
          {MODE_LABELS[referral.mode] ?? referral.mode}
        </StatusBadge>
        {referral.mode === "lightning_address" && referral.lightning_address && (
          <div className="mt-1 truncate font-mono text-xs text-slate-400" title={referral.lightning_address}>
            {referral.lightning_address}
          </div>
        )}
      </td>
      <td className="align-top">
        {referral.referral_rate != null ? (
          <span className="font-mono text-sm text-slate-100">{referral.referral_rate}%</span>
        ) : (
          <span className="text-xs text-slate-500 italic">company default</span>
        )}
      </td>
      <td className="align-top text-xs text-slate-400">{new Date(referral.created).toLocaleDateString()}</td>
    </tr>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="flex-1 rounded-lg bg-slate-800 p-4">
          <label htmlFor="referrer-search" className="block text-sm font-medium text-gray-300 mb-1">
            Search by code or user pubkey
          </label>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              id="referrer-search"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="e.g. ALPHA123 or a 64-char hex pubkey"
              className="w-full pl-9 pr-9 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none text-sm"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          <ArrowPathIcon className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <PaginatedTable<AdminReferralInfo>
        apiCall={({ limit, offset }) => api.getReferrals({ limit, offset, search: appliedSearch || undefined })}
        renderHeader={renderHeader}
        renderRow={renderRow}
        errorAction="load referrers"
        loadingMessage="Loading referrers..."
        dependencies={[appliedSearch, refreshKey]}
        calculateStats={renderStats}
        minWidth="800px"
        renderEmptyState={() => (
          <div className="text-center py-8">
            <GiftIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-lg">No referrers found</p>
            {appliedSearch ? (
              <p className="text-gray-500 text-sm mt-1">No referrers match "{appliedSearch}"</p>
            ) : (
              <p className="text-gray-500 text-sm mt-1">No users have enrolled in the referral program yet</p>
            )}
          </div>
        )}
      />
    </div>
  );
}

/** Tab: VMs created with a referral code (client-side filtered, no server-side ref_code filter). */
function ReferredVmsTab() {
  const api = useAdminApi();
  const [refCodeFilter, setRefCodeFilter] = useState("");
  const [appliedFilter, setAppliedFilter] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSearch = () => setAppliedFilter(refCodeFilter.trim());

  const handleClear = () => {
    setRefCodeFilter("");
    setAppliedFilter("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  // The API doesn't support filtering by ref_code, so we fetch a batch and filter client-side.
  const fetchFilteredReferrals = async ({ limit, offset }: { limit: number; offset: number }) => {
    const result = await api.getVMs({ limit: 100, offset, include_deleted: false });
    const filtered = appliedFilter
      ? result.data.filter((vm) => vm.ref_code?.toLowerCase() === appliedFilter.toLowerCase())
      : result.data.filter((vm) => vm.ref_code);
    return { ...result, data: filtered.slice(0, limit), total: filtered.length };
  };

  const renderStats = (items: AdminVmInfo[], total: number) => {
    const uniqueCodes = new Set(items.map((vm) => vm.ref_code).filter(Boolean)).size;
    const uniqueRegions = new Set(items.map((vm) => vm.region_name)).size;
    return (
      <StatsHeader
        stats={[
          { label: "Referred VMs (page)", value: `${items.length} of ${total}` },
          { label: "Unique Ref Codes", value: uniqueCodes, tone: "success" },
          { label: "Regions", value: uniqueRegions, tone: "purple" },
        ]}
      />
    );
  };

  const renderHeader = () => (
    <>
      <th>VM &amp; Ref Code</th>
      <th>User</th>
      <th>Region &amp; Template</th>
      <th>IP Addresses</th>
      <th>Resources</th>
      <th>Dates</th>
    </>
  );

  const renderRow = (vm: AdminVmInfo) => (
    <tr key={vm.id}>
      <td className="align-top">
        <Link to={`/vms/${vm.id}`} className="font-mono text-blue-400 hover:text-blue-300">
          #{vm.id}
        </Link>
        <div className="mt-1">
          <span className="rounded bg-blue-900 px-2 py-0.5 font-mono text-xs font-semibold text-blue-200">
            {vm.ref_code}
          </span>
        </div>
      </td>
      <td className="align-top">
        <Link to={`/users/${vm.user_id}`} className="block min-w-0 max-w-[14rem] text-blue-400 hover:text-blue-300">
          <span className="font-mono text-xs">{vm.user_pubkey.slice(0, 12)}…</span>
          {vm.user_email && (
            <span className="block truncate text-xs text-slate-400" title={vm.user_email}>
              {vm.user_email}
            </span>
          )}
        </Link>
      </td>
      <td className="align-top text-gray-300">
        <div className="min-w-0 max-w-[14rem]">
          <div className="truncate" title={vm.region_name}>
            {vm.region_name}
          </div>
          <div className="mt-0.5 truncate text-xs text-slate-400" title={vm.template_name}>
            {vm.template_name}
          </div>
        </div>
      </td>
      <td className="align-top">
        <div className="space-y-0.5">
          {vm.ip_addresses.map((ip) => (
            <div key={ip.id} className="truncate font-mono text-xs text-gray-300" title={ip.ip}>
              {ip.ip}
            </div>
          ))}
        </div>
      </td>
      <td className="align-top">
        <span className="text-xs text-gray-300">
          {vm.cpu}c / {formatBytes(vm.memory)} / {formatBytes(vm.disk_size)}
        </span>
      </td>
      <td className="align-top text-xs text-gray-300">
        <div>Created {new Date(vm.created).toLocaleDateString()}</div>
        <div className="mt-0.5 text-slate-400">Expires {new Date(vm.expires).toLocaleDateString()}</div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-slate-800 p-4">
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
            className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-slate-950 font-semibold rounded-md text-sm transition-colors"
          >
            Search
          </button>
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
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-500 hover:bg-blue-400 text-slate-950 font-semibold rounded-md transition-colors"
          >
            <ChartBarIcon className="h-4 w-4" />
            View Report
          </Link>
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
        minWidth="800px"
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
