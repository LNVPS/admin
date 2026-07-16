import {
  ExclamationTriangleIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  ServerIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { bech32ToHex } from "@snort/shared";
import { tryParseNostrLink } from "@snort/system";
import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { CreateVmModal } from "../components/CreateVmModal";
import { EditUserModal } from "../components/EditUserModal";
import { countActiveFilters, FilterBar, FilterButton, type FilterField } from "../components/FilterBar";
import { PaginatedTable } from "../components/PaginatedTable";
import { Profile } from "../components/Profile";
import { StatsHeader } from "../components/StatsHeader";
import { useAdminApi } from "../hooks/useAdminApi";
import { useApiCall } from "../hooks/useApiCall";
import { type AdminUserInfo, AdminUserRole, getCountryName, type PaginatedApiResponse } from "../lib/api";

export function UsersPage() {
  const adminApi = useAdminApi();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateVmModal, setShowCreateVmModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserInfo | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [regionFilter, setRegionFilter] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [hasVmsFilter, setHasVmsFilter] = useState<string>("true");

  const { data: regions } = useApiCall(async () => (await adminApi.getRegions({ limit: 100 })).data, []);

  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const parseSearchTerm = (term: string): string => {
    const trimmedTerm = term.trim();
    if (!trimmedTerm) return "";

    // If it's a number (user ID), return as-is
    if (/^\d+$/.test(trimmedTerm)) {
      return trimmedTerm;
    }

    // If it looks like an email, return as-is
    if (trimmedTerm.includes("@")) {
      return trimmedTerm;
    }

    // Only try nostr parsing if it looks like a nostr identifier
    const looksLikeNostr =
      trimmedTerm.startsWith("npub1") || trimmedTerm.startsWith("nprofile1") || trimmedTerm.startsWith("nostr:");

    if (looksLikeNostr) {
      try {
        const link = tryParseNostrLink(trimmedTerm);
        if (link) {
          return link.id; // This gives us the hex pubkey
        }

        // Try bech32 decode for npub/nprofile without nostr: prefix
        if (trimmedTerm.startsWith("npub1") || trimmedTerm.startsWith("nprofile1")) {
          return bech32ToHex(trimmedTerm);
        }
      } catch (error) {
        console.debug("Failed to parse nostr identifier:", error);
      }
    }

    return trimmedTerm;
  };

  const getSearchParams = () => {
    const parsed = parseSearchTerm(searchTerm);
    const params: {
      search?: string;
      region_id?: number;
      role?: AdminUserRole;
      has_vms?: boolean;
    } = {};
    if (parsed) params.search = parsed;
    if (regionFilter) params.region_id = Number(regionFilter);
    if (roleFilter) params.role = roleFilter as AdminUserRole;
    if (hasVmsFilter) params.has_vms = hasVmsFilter === "true";
    return params;
  };

  // The list endpoint's `search` only accepts a 64-char hex pubkey, so email and
  // numeric-ID lookups go through their dedicated single-user endpoints and are
  // wrapped as a one-row paginated response.
  // biome-ignore lint/correctness/useExhaustiveDependencies: getSearchParams only reads the listed state
  const fetchUsers = useCallback(
    async (params: { limit: number; offset: number }): Promise<PaginatedApiResponse<AdminUserInfo>> => {
      const term = searchTerm.trim();

      const single = async (fetch: () => Promise<AdminUserInfo>): Promise<PaginatedApiResponse<AdminUserInfo>> => {
        try {
          const user = await fetch();
          return { data: [user], total: 1, limit: params.limit, offset: 0 };
        } catch (err) {
          // A missing user is an empty result, not a page error.
          if (err instanceof Error && /not found/i.test(err.message)) {
            return { data: [], total: 0, limit: params.limit, offset: 0 };
          }
          throw err;
        }
      };

      if (term.includes("@")) return single(() => adminApi.getUserByEmail(term));
      if (/^\d+$/.test(term)) return single(() => adminApi.getUser(Number(term)));

      return adminApi.getUsers({ ...params, ...getSearchParams() });
    },
    [searchTerm, regionFilter, roleFilter, hasVmsFilter],
  );

  const clearSearch = () => {
    setSearchTerm("");
  };

  const filterFields: FilterField[] = [
    {
      kind: "select",
      key: "region",
      label: "Region",
      value: regionFilter,
      onChange: setRegionFilter,
      options: [
        { value: "", label: "All regions" },
        ...(regions?.map((region) => ({ value: String(region.id), label: region.name })) ?? []),
      ],
    },
    {
      kind: "select",
      key: "role",
      label: "Admin role",
      value: roleFilter,
      onChange: setRoleFilter,
      options: [
        { value: "", label: "All roles" },
        { value: AdminUserRole.SUPER_ADMIN, label: "Super Admin" },
        { value: AdminUserRole.ADMIN, label: "Admin" },
        { value: AdminUserRole.READ_ONLY, label: "Read Only" },
      ],
    },
    {
      kind: "select",
      key: "has_vms",
      label: "VM ownership",
      value: hasVmsFilter,
      onChange: setHasVmsFilter,
      options: [
        { value: "", label: "Any VMs" },
        { value: "true", label: "With VMs" },
        { value: "false", label: "Without VMs" },
      ],
    },
  ];

  const clearFilters = () => {
    setRegionFilter("");
    setRoleFilter("");
    setHasVmsFilter("");
  };

  const handleEdit = (user: AdminUserInfo) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleCreateVm = (user: AdminUserInfo) => {
    setSelectedUser(user);
    setShowCreateVmModal(true);
  };

  const handleVmCreated = (jobId: string) => {
    console.log("VM creation job dispatched:", jobId);
    refreshData(); // Refresh user list to show updated VM count
  };

  const renderHeader = () => (
    <>
      <th className="w-12">ID</th>
      <th>User</th>
      <th>Contact &amp; Location</th>
      <th>VMs &amp; Role</th>
      <th>Created</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (user: AdminUserInfo, index: number) => {
    const countryName = user.country_code ? getCountryName(user.country_code) : null;
    const geoCountryName = user.geo_country_code ? getCountryName(user.geo_country_code) : null;
    const countryMismatch =
      !!user.country_code && !!user.geo_country_code && user.country_code !== user.geo_country_code;
    return (
      <tr key={user.id || index}>
        <td className="whitespace-nowrap align-top">
          <Link to={`/users/${user.id}`} state={{ user }} className="text-blue-400 hover:text-blue-300 font-mono">
            {user.id}
          </Link>
        </td>
        {/* User: profile + email */}
        <td className="align-top">
          <div className="min-w-0 max-w-[18rem]">
            {user.pubkey ? (
              <Profile pubkey={user.pubkey} avatarSize="sm" />
            ) : (
              <span className="text-gray-400">N/A</span>
            )}
            {user.email && (
              <div className="mt-0.5 truncate text-xs text-blue-400" title={user.email}>
                {user.email}
              </div>
            )}
          </div>
        </td>
        {/* Contact + location */}
        <td className="align-top">
          <div className="min-w-0 max-w-[14rem]">
            <div className="flex gap-1">
              {user.contact_email && (
                <span className="inline-flex px-1 py-0.5 bg-green-900 text-green-300 rounded text-xs">Email</span>
              )}
              {user.contact_nip17 && (
                <span className="inline-flex px-1 py-0.5 bg-purple-900 text-purple-300 rounded text-xs">NIP-17</span>
              )}
              {!user.contact_email && !user.contact_nip17 && <span className="text-gray-500 text-xs">No contact</span>}
            </div>
            {countryName && (
              <div className="mt-0.5 truncate text-xs text-slate-400" title={countryName}>
                {countryName}
              </div>
            )}
            {geoCountryName && (
              <div
                className={`flex items-center gap-1 truncate text-xs ${
                  countryMismatch ? "text-amber-400" : "text-slate-500"
                }`}
                title={
                  countryMismatch
                    ? `Geo-coded country (${geoCountryName}) differs from billing country (${countryName})`
                    : `Geo-coded from ${user.geo_ip ?? "IP"}`
                }
              >
                {countryMismatch && <ExclamationTriangleIcon className="h-3 w-3 shrink-0" />}
                <span className="truncate">Geo: {geoCountryName}</span>
              </div>
            )}
          </div>
        </td>
        {/* VMs + role */}
        <td className="align-top">
          <span
            className={`inline-flex px-1.5 py-0.5 font-medium rounded text-xs ${
              user.vm_count > 0 ? "bg-blue-900 text-blue-300" : "bg-gray-600 text-gray-400"
            }`}
          >
            {user.vm_count} VMs
          </span>
          <div className="mt-1">
            <span
              className={`inline-flex px-1.5 py-0.5 font-medium rounded text-xs ${
                user.is_admin ? "bg-orange-900 text-orange-300" : "bg-gray-600 text-gray-300"
              }`}
            >
              {user.is_admin ? "Admin" : "User"}
            </span>
          </div>
        </td>
        {/* Created date */}
        <td className="align-top">
          <div className="text-xs text-slate-400">
            {new Date(user.created).toLocaleDateString("en-US", {
              month: "2-digit",
              day: "2-digit",
              year: "2-digit",
            })}
          </div>
        </td>
        <td className="text-right align-top">
          <div className="flex justify-end space-x-2">
            <Link to={`/users/${user.id}`} state={{ user }}>
              <Button size="sm" variant="secondary" className="p-1" title="View Details">
                <EyeIcon className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleCreateVm(user)}
              className="p-1 text-green-400 hover:text-green-300"
              title="Create VM for User"
            >
              <ServerIcon className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleEdit(user)} className="p-1" title="Edit User">
              <PencilIcon className="h-4 w-4" />
            </Button>
          </div>
        </td>
      </tr>
    );
  };

  const calculateStats = (users: AdminUserInfo[], totalItems: number, error?: Error | null) => {
    const stats = {
      total: totalItems,
      admins: users.filter((user) => user.is_admin).length,
      withVMs: users.filter((user) => user.vm_count > 0).length,
      totalVMs: users.reduce((sum, user) => sum + user.vm_count, 0),
      withEmail: users.filter((user) => user.email).length,
    };

    return (
      <StatsHeader
        title="Users"
        stats={[
          { label: "Total", value: stats.total },
          { label: "Admins", value: stats.admins, tone: "orange" },
          { label: "With VMs", value: stats.withVMs, tone: "accent" },
          { label: "Total VMs", value: stats.totalVMs, tone: "accent" },
          { label: "With Email", value: stats.withEmail, tone: "success" },
        ]}
        actions={
          <div className="flex flex-col items-end space-y-2">
            <div className="relative">
              <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by email, ID, npub, or nprofile..."
                className={`pl-10 pr-10 py-2 w-80 bg-gray-700 border rounded-md text-white placeholder-gray-400 focus:outline-none ${
                  error ? "border-red-500" : "border-gray-600 focus:border-blue-500"
                }`}
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            <FilterButton
              open={showFilters}
              activeCount={countActiveFilters(filterFields)}
              onClick={() => setShowFilters((prev) => !prev)}
            />
            {error && <span className="text-red-400 text-xs">{error.message}</span>}
          </div>
        }
      />
    );
  };

  return (
    <div className="space-y-6">
      <PaginatedTable
        apiCall={fetchUsers}
        toolbar={
          <FilterBar
            open={showFilters}
            fields={filterFields}
            onClear={clearFilters}
            onClose={() => setShowFilters(false)}
          />
        }
        renderHeader={renderHeader}
        renderRow={renderRow}
        calculateStats={calculateStats}
        itemsPerPage={20}
        errorAction="view users"
        loadingMessage="Loading users..."
        dependencies={[refreshTrigger, searchTerm, regionFilter, roleFilter, hasVmsFilter]}
        minWidth="820px"
        inlineError={true}
      />

      {/* Edit User Modal */}
      {selectedUser && (
        <EditUserModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          onSuccess={refreshData}
        />
      )}

      {/* Create VM Modal */}
      {selectedUser && (
        <CreateVmModal
          isOpen={showCreateVmModal}
          onClose={() => {
            setShowCreateVmModal(false);
            setSelectedUser(null);
          }}
          preselectedUser={selectedUser}
          onSuccess={handleVmCreated}
        />
      )}
    </div>
  );
}
