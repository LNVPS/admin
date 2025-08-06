import { useAdminApi } from "../hooks/useAdminApi";
import { PaginatedTable } from "../components/PaginatedTable";
import { Profile } from "../components/Profile";
import { AdminUserInfo } from "../lib/api";

export function UsersPage() {
  const adminApi = useAdminApi();

  const renderHeader = () => (
    <>
      <th className="w-12">ID</th>
      <th>User</th>
      <th>Contact</th>
      <th>Loc</th>
      <th className="w-12">VMs</th>
      <th className="w-16">Role</th>
      <th>Activity</th>
    </>
  );

  const renderRow = (user: AdminUserInfo, index: number) => (
    <tr key={user.id || index}>
      <td className="whitespace-nowrap text-white">{user.id}</td>
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
            <div className="font-mono">{user.country_code}</div>
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
    <PaginatedTable
      apiCall={(params) => adminApi.getUsers(params)}
      renderHeader={renderHeader}
      renderRow={renderRow}
      calculateStats={calculateStats}
      itemsPerPage={20}
      errorAction="view users"
      loadingMessage="Loading users..."
      minWidth="1000px"
    />
  );
}
