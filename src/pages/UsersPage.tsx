import { useState } from "react";
import { Link } from "react-router-dom";
import { useAdminApi } from "../hooks/useAdminApi";
import { PaginatedTable } from "../components/PaginatedTable";
import { Profile } from "../components/Profile";
import { Button } from "../components/Button";
import { EditUserModal } from "../components/EditUserModal";
import { AdminUserInfo, getCountryName } from "../lib/api";
import { PencilIcon, EyeIcon } from "@heroicons/react/24/outline";

export function UsersPage() {
  const adminApi = useAdminApi();
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserInfo | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleEdit = (user: AdminUserInfo) => {
    setSelectedUser(user);
    setShowEditModal(true);
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

  const calculateStats = (users: AdminUserInfo[], totalItems: number) => {
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
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PaginatedTable
        apiCall={(params) => adminApi.getUsers(params)}
        renderHeader={renderHeader}
        renderRow={renderRow}
        calculateStats={calculateStats}
        itemsPerPage={20}
        errorAction="view users"
        loadingMessage="Loading users..."
        dependencies={[refreshTrigger]}
        minWidth="1000px"
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
    </div>
  );
}
