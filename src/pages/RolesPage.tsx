import { useAdminApi } from "../hooks/useAdminApi";
import { PaginatedTable } from "../components/PaginatedTable";
import { AdminRoleInfo } from "../lib/api";

export function RolesPage() {
  const adminApi = useAdminApi();

  const renderHeader = () => (
    <>
      <th>ID</th>
      <th>Name</th>
      <th>Description</th>
      <th>Permissions</th>
    </>
  );

  const renderRow = (role: AdminRoleInfo, index: number) => (
    <tr key={role.id || index}>
      <td className="whitespace-nowrap text-white">{role.id}</td>
      <td className="whitespace-nowrap text-gray-300">{role.name}</td>
      <td className="text-gray-400">{role.description || "No description"}</td>
      <td className="text-gray-300">
        <div className="flex flex-wrap gap-1">
          {role.permissions && role.permissions.length > 0 ? (
            <>
              {role.permissions
                .slice(0, 2)
                .map((permission: string, idx: number) => (
                  <span
                    key={idx}
                    className="inline-flex px-2 py-1 font-semibold rounded-full bg-blue-900 text-blue-300"
                  >
                    {permission}
                  </span>
                ))}
              {role.permissions.length > 2 && (
                <span className="inline-flex px-2 py-1 font-semibold rounded-full bg-gray-600 text-gray-300">
                  +{role.permissions.length - 2} more
                </span>
              )}
            </>
          ) : (
            <span className="text-gray-500">No permissions</span>
          )}
        </div>
      </td>
    </tr>
  );

  const calculateStats = (roles: AdminRoleInfo[], totalItems: number) => {
    const stats = {
      total: totalItems,
      systemRoles: roles.filter((role) => role.is_system_role).length,
      customRoles: roles.filter((role) => !role.is_system_role).length,
    };

    return (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Roles</h1>
          <div className="mt-2 flex gap-4 text-sm text-gray-400">
            <span>
              Total:{" "}
              <span className="text-white font-medium">{stats.total}</span>
            </span>
            <span>
              System:{" "}
              <span className="text-blue-400 font-medium">
                {stats.systemRoles}
              </span>
            </span>
            <span>
              Custom:{" "}
              <span className="text-green-400 font-medium">
                {stats.customRoles}
              </span>
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <PaginatedTable
      apiCall={(params) => adminApi.getRoles(params)}
      renderHeader={renderHeader}
      renderRow={renderRow}
      calculateStats={calculateStats}
      itemsPerPage={25}
      errorAction="view roles"
      loadingMessage="Loading roles..."
    />
  );
}
