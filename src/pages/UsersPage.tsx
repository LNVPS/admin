import { useState } from "react";
import { Link } from "react-router-dom";
import { useAdminApi } from "../hooks/useAdminApi";
import { PaginatedTable } from "../components/PaginatedTable";
import { Profile } from "../components/Profile";
import { Button } from "../components/Button";
import { EditUserModal } from "../components/EditUserModal";
import { CreateVmModal } from "../components/CreateVmModal";
import { type AdminUserInfo, getCountryName } from "../lib/api";
import {
  PencilIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ServerIcon,
} from "@heroicons/react/24/outline";
import { tryParseNostrLink } from "@snort/system";
import { bech32ToHex } from "@snort/shared";

export function UsersPage() {
  const adminApi = useAdminApi();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateVmModal, setShowCreateVmModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserInfo | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

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
      trimmedTerm.startsWith("npub1") ||
      trimmedTerm.startsWith("nprofile1") ||
      trimmedTerm.startsWith("nostr:");

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
    return parsed ? { search: parsed } : {};
  };

  const clearSearch = () => {
    setSearchTerm("");
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
      <th>Contact</th>
      <th>Loc</th>
      <th className="w-12">VMs</th>
      <th className="w-16">Role</th>
      <th>Activity</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (user: AdminUserInfo, index: number) => (
    <tr key={user.id || index}>
      <td className="whitespace-nowrap">
        <Link
          to={`/users/${user.id}`}
          state={{ user }}
          className="text-blue-400 hover:text-blue-300 font-mono"
        >
          {user.id}
        </Link>
      </td>
      <td className="whitespace-nowrap">
        {user.pubkey ? (
          <Profile pubkey={user.pubkey} avatarSize="sm" />
        ) : (
          <span className="text-gray-400">N/A</span>
        )}
      </td>
      <td>
        <div className="space-y-0.5 max-w-32">
          {user.email && (
            <div className="text-blue-400 truncate" title={user.email}>
              {user.email.length > 15
                ? user.email.substring(0, 15) + "..."
                : user.email}
            </div>
          )}
          <div className="flex gap-0.5">
            {user.contact_email && (
              <span className="inline-flex px-0.5 py-0.5 bg-green-900 text-green-300 rounded">
                E
              </span>
            )}
            {user.contact_nip17 && (
              <span className="inline-flex px-0.5 py-0.5 bg-purple-900 text-purple-300 rounded">
                N
              </span>
            )}
            {!user.contact_email && !user.contact_nip17 && (
              <span className="text-gray-500">-</span>
            )}
          </div>
        </div>
      </td>
      <td>
        <div className="space-y-0.5">
          {user.country_code && (
            <div
              className="text-white truncate max-w-20"
              title={getCountryName(user.country_code)}
            >
              {getCountryName(user.country_code).length > 12
                ? getCountryName(user.country_code).substring(0, 12) + "..."
                : getCountryName(user.country_code)}
            </div>
          )}
          {user.billing_city && (
            <div
              className="text-gray-400 truncate max-w-16"
              title={`${user.billing_city}, ${user.billing_state || ""}`}
            >
              {user.billing_city.length > 8
                ? user.billing_city.substring(0, 8) + "..."
                : user.billing_city}
            </div>
          )}
          {!user.country_code && !user.billing_city && (
            <span className="text-gray-500">-</span>
          )}
        </div>
      </td>
      <td className="whitespace-nowrap text-center">
        <span
          className={`inline-flex px-0.5 py-0.5 font-medium rounded ${
            user.vm_count > 0
              ? "bg-blue-900 text-blue-300"
              : "bg-gray-600 text-gray-400"
          }`}
        >
          {user.vm_count}
        </span>
      </td>
      <td className="whitespace-nowrap">
        <span
          className={`inline-flex px-0.5 py-0.5 font-medium rounded ${
            user.is_admin
              ? "bg-orange-900 text-orange-300"
              : "bg-gray-600 text-gray-300"
          }`}
        >
          {user.is_admin ? "A" : "U"}
        </span>
      </td>
      <td>
        <div className="space-y-0.5">
          <div className="text-gray-400">
            {new Date(user.created).toLocaleDateString("en-US", {
              month: "2-digit",
              day: "2-digit",
              year: "2-digit",
            })}
          </div>
          {user.last_login ? (
            <div className="text-green-400">
              {new Date(user.last_login).toLocaleDateString("en-US", {
                month: "2-digit",
                day: "2-digit",
                year: "2-digit",
              })}
            </div>
          ) : (
            <div className="text-red-400">Never</div>
          )}
        </div>
      </td>
      <td className="text-right">
        <div className="flex justify-end space-x-2">
          <Link to={`/users/${user.id}`} state={{ user }}>
            <Button
              size="sm"
              variant="secondary"
              className="p-1"
              title="View Details"
            >
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
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleEdit(user)}
            className="p-1"
            title="Edit User"
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );

  const calculateStats = (users: AdminUserInfo[], totalItems: number, error?: Error | null) => {
    const stats = {
      total: totalItems,
      admins: users.filter((user) => user.is_admin).length,
      withVMs: users.filter((user) => user.vm_count > 0).length,
      totalVMs: users.reduce((sum, user) => sum + user.vm_count, 0),
      withEmail: users.filter((user) => user.email).length,
      recentLogins: users.filter(
        (user) =>
          user.last_login &&
          new Date(user.last_login) >
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      ).length,
    };

    return (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <div className="mt-2 flex gap-4 text-sm text-gray-400">
            <span>
              Total:{" "}
              <span className="text-white font-medium">{stats.total}</span>
            </span>
            <span>
              Admins:{" "}
              <span className="text-orange-400 font-medium">
                {stats.admins}
              </span>
            </span>
            <span>
              With VMs:{" "}
              <span className="text-blue-400 font-medium">{stats.withVMs}</span>
            </span>
            <span>
              Total VMs:{" "}
              <span className="text-blue-300 font-medium">
                {stats.totalVMs}
              </span>
            </span>
            <span>
              With Email:{" "}
              <span className="text-green-400 font-medium">
                {stats.withEmail}
              </span>
            </span>
            <span>
              Active (30d):{" "}
              <span className="text-green-300 font-medium">
                {stats.recentLogins}
              </span>
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end space-y-1">
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
          {error && (
            <span className="text-red-400 text-xs">{error.message}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PaginatedTable
        apiCall={(params) =>
          adminApi.getUsers({ ...params, ...getSearchParams() })
        }
        renderHeader={renderHeader}
        renderRow={renderRow}
        calculateStats={calculateStats}
        itemsPerPage={20}
        errorAction="view users"
        loadingMessage="Loading users..."
        dependencies={[refreshTrigger, searchTerm]}
        minWidth="1000px"
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
