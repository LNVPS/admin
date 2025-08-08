import { useState } from "react";
import * as React from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAdminApi } from "../hooks/useAdminApi";
import { useUserRoles } from "../hooks/useUserRoles";
import { PaginatedTable } from "../components/PaginatedTable";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { StatusBadge } from "../components/StatusBadge";
import { Profile } from "../components/Profile";
import { PermissionGuard } from "../components/PermissionGuard";
import { VmStatusBadge, getVmStatus } from "../components/VmStatusBadge";
import { EditUserModal } from "../components/EditUserModal";
import {
  AdminUserInfo,
  AdminVmInfo,
  UserRoleInfo,
  AdminRoleInfo,
  VmRunningStates,
  getCountryName,
} from "../lib/api";
import { formatBytes } from "../utils/formatBytes";
import {
  ServerIcon,
  ShieldCheckIcon,
  UserIcon,
  MapPinIcon,
  EnvelopeIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";

export function UserDetailsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const adminApi = useAdminApi();
  const { hasPermission } = useUserRoles();

  // Get user data from navigation state
  const user = location.state?.user as AdminUserInfo | undefined;
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);

  // Check if user has permission to update users (assign/revoke roles)
  const canManageRoles = hasPermission("users::update");

  // If no user data in state, redirect back to users list
  if (!user) {
    navigate("/users", { replace: true });
    return null;
  }

  const refreshRoles = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const refreshUserData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleRemoveRole = async (roleId: number, roleName: string) => {
    if (
      confirm(
        `Are you sure you want to remove the "${roleName}" role from this user?`,
      )
    ) {
      try {
        await adminApi.revokeUserRole(user.id, roleId);
        refreshRoles();
      } catch (error) {
        console.error("Failed to remove role:", error);
        alert("Failed to remove role. Please try again.");
      }
    }
  };

  const renderVMHeader = () => (
    <>
      <th>ID</th>
      <th>Image</th>
      <th>Template</th>
      <th>Resources</th>
      <th>Status</th>
      <th>Host</th>
      <th>Created</th>
      <th>Expires</th>
    </>
  );

  const renderVMRow = (vm: AdminVmInfo, index: number) => (
    <tr
      key={vm.id || index}
      className={`hover:bg-slate-700 ${vm.deleted ? "bg-gray-800/50 opacity-75" : ""}`}
    >
      <td className="whitespace-nowrap font-mono">
        <Link
          to={`/vms/${vm.id}`}
          className="text-blue-400 hover:text-blue-300"
        >
          #{vm.id}
        </Link>
      </td>
      <td className="text-gray-300">{vm.image_name}</td>
      <td className="text-gray-300">{vm.template_name}</td>
      <td className="text-gray-400 text-sm">
        {vm.cpu}C • {formatBytes(vm.memory)} • {formatBytes(vm.disk_size)}
      </td>
      <td>
        <VmStatusBadge vm={vm} />
      </td>
      <td className="text-gray-300">{vm.host_name || `#${vm.host_id}`}</td>
      <td className="text-gray-400 text-sm">
        {new Date(vm.created).toLocaleDateString()}
      </td>
      <td className="text-gray-400 text-sm">
        <div
          className={
            new Date(vm.expires) < new Date()
              ? "text-red-400"
              : new Date(vm.expires).getTime() - new Date().getTime() <
                  24 * 60 * 60 * 1000
                ? "text-yellow-400"
                : "text-gray-400"
          }
        >
          {new Date(vm.expires).toLocaleDateString()}
        </div>
      </td>
    </tr>
  );

  const renderRolesHeader = () => (
    <>
      <th>Role</th>
      <th>Description</th>
      <th>Permissions</th>
      <th>Type</th>
      {canManageRoles && <th className="text-right">Actions</th>}
    </>
  );

  const renderRolesRow = (roleInfo: UserRoleInfo, index: number) => (
    <tr key={roleInfo.role.id || index}>
      <td className="font-semibold text-blue-400">{roleInfo.role.name}</td>
      <td className="text-gray-300">
        {roleInfo.role.description || "No description"}
      </td>
      <td className="text-gray-300">
        <div className="flex flex-wrap gap-1">
          {roleInfo.role.permissions && roleInfo.role.permissions.length > 0 ? (
            <>
              {roleInfo.role.permissions
                .slice(0, 3)
                .map((permission: string, idx: number) => (
                  <span
                    key={idx}
                    className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-900 text-blue-300"
                  >
                    {permission}
                  </span>
                ))}
              {roleInfo.role.permissions.length > 3 && (
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-600 text-gray-300">
                  +{roleInfo.role.permissions.length - 3} more
                </span>
              )}
            </>
          ) : (
            <span className="text-gray-500">No permissions</span>
          )}
        </div>
      </td>
      <td>
        <StatusBadge
          status={roleInfo.role.is_system_role ? "running" : "unknown"}
        >
          {roleInfo.role.is_system_role ? "System" : "Custom"}
        </StatusBadge>
      </td>
      {canManageRoles && (
        <td className="text-right">
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              handleRemoveRole(roleInfo.role.id, roleInfo.role.name)
            }
            className="text-red-400 hover:text-red-300 p-1"
            title="Remove Role"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </td>
      )}
    </tr>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User #{user.id}</h1>
        </div>
        <div className="flex items-center space-x-2">
          <PermissionGuard requiredPermissions={["users::update"]}>
            <Button
              onClick={() => setShowEditUserModal(true)}
              className="flex items-center space-x-2"
            >
              <PencilIcon className="h-4 w-4" />
              <span>Edit User</span>
            </Button>
          </PermissionGuard>
          <Link to="/users">
            <Button
              variant="secondary"
              className="text-gray-400 hover:text-gray-300"
            >
              Back to Users
            </Button>
          </Link>
        </div>
      </div>

      {/* User Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Profile Card */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-4">
            <UserIcon className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Profile</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Profile pubkey={user.pubkey} avatarSize="md" />
            </div>
            <div>
              <div className="text-gray-400 text-sm">Public Key</div>
              <div className="font-mono text-white text-sm break-all">
                {user.pubkey}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Created</div>
              <div className="text-white">
                {new Date(user.created).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info Card */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-4">
            <EnvelopeIcon className="h-5 w-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Contact</h3>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-gray-400 text-sm">Email</div>
              <div className="text-white">
                {user.email || (
                  <span className="text-gray-500">Not provided</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-400">NIP-17 Contact</div>
                <StatusBadge
                  status={user.contact_nip17 ? "running" : "stopped"}
                >
                  {user.contact_nip17 ? "Enabled" : "Disabled"}
                </StatusBadge>
              </div>
              <div>
                <div className="text-gray-400">Email Contact</div>
                <StatusBadge
                  status={user.contact_email ? "running" : "stopped"}
                >
                  {user.contact_email ? "Enabled" : "Disabled"}
                </StatusBadge>
              </div>
            </div>
          </div>
        </div>

        {/* Billing Info Card */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-4">
            <MapPinIcon className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Billing</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-gray-400">Country</div>
              <div className="text-white">
                {user.country_code ? (
                  getCountryName(user.country_code)
                ) : (
                  <span className="text-gray-500">Not set</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Name</div>
              <div className="text-white">
                {user.billing_name || (
                  <span className="text-gray-500">Not provided</span>
                )}
              </div>
            </div>
            {user.billing_address_1 && (
              <div>
                <div className="text-gray-400">Address</div>
                <div className="text-white">
                  <div>{user.billing_address_1}</div>
                  {user.billing_address_2 && (
                    <div>{user.billing_address_2}</div>
                  )}
                  <div>
                    {[
                      user.billing_city,
                      user.billing_state,
                      user.billing_postcode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                </div>
              </div>
            )}
            {user.billing_tax_id && (
              <div>
                <div className="text-gray-400">Tax ID</div>
                <div className="text-white font-mono">
                  {user.billing_tax_id}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User's VMs */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
          <ServerIcon className="h-5 w-5" />
          <span>Virtual Machines</span>
        </h2>
        <PaginatedTable
          apiCall={(params) =>
            adminApi.getVMs({
              ...params,
              user_id: user.id,
            })
          }
          renderHeader={renderVMHeader}
          renderRow={renderVMRow}
          itemsPerPage={10}
          errorAction="load user VMs"
          loadingMessage="Loading user VMs..."
          dependencies={[user.id, refreshTrigger]}
          calculateStats={(vms, total) => {
            const stats = {
              total,
              running: vms.filter(
                (vm) => getVmStatus(vm) === VmRunningStates.RUNNING,
              ).length,
              stopped: vms.filter(
                (vm) => getVmStatus(vm) === VmRunningStates.STOPPED,
              ).length,
              new: vms.filter((vm) => getVmStatus(vm) === "new").length,
              deleted: vms.filter((vm) => vm.deleted).length,
            };

            return (
              <div className="flex gap-4 text-sm text-gray-400">
                <span>
                  Total VMs:{" "}
                  <span className="text-white font-medium">{stats.total}</span>
                </span>
                <span>
                  Running:{" "}
                  <span className="text-green-400 font-medium">
                    {stats.running}
                  </span>
                </span>
                <span>
                  Stopped:{" "}
                  <span className="text-red-400 font-medium">
                    {stats.stopped}
                  </span>
                </span>
                {stats.new > 0 && (
                  <span>
                    New:{" "}
                    <span className="text-yellow-400 font-medium">
                      {stats.new}
                    </span>
                  </span>
                )}
                {stats.deleted > 0 && (
                  <span>
                    Deleted:{" "}
                    <span className="text-gray-400 font-medium">
                      {stats.deleted}
                    </span>
                  </span>
                )}
              </div>
            );
          }}
        />
      </div>

      {/* User's Roles */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
            <ShieldCheckIcon className="h-5 w-5" />
            <span>Roles & Permissions</span>
          </h2>
          <PermissionGuard requiredPermissions={["users::update"]}>
            <Button
              onClick={() => setShowAddRoleModal(true)}
              className="flex items-center space-x-2"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Add Role</span>
            </Button>
          </PermissionGuard>
        </div>
        <PaginatedTable
          apiCall={async () => {
            const roles = await adminApi.getUserRoles(user.id);
            return {
              data: roles,
              total: roles.length,
              limit: roles.length,
              offset: 0,
            };
          }}
          renderHeader={renderRolesHeader}
          renderRow={renderRolesRow}
          itemsPerPage={10}
          errorAction="load user roles"
          loadingMessage="Loading user roles..."
          dependencies={[user.id, refreshTrigger]}
          calculateStats={(roles, total) => (
            <div className="flex gap-4 text-sm text-gray-400">
              <span>
                Total roles:{" "}
                <span className="text-white font-medium">{total}</span>
              </span>
              <span>
                System roles:{" "}
                <span className="text-blue-400 font-medium">
                  {roles.filter((r) => r.role.is_system_role).length}
                </span>
              </span>
              <span>
                Custom roles:{" "}
                <span className="text-green-400 font-medium">
                  {roles.filter((r) => !r.role.is_system_role).length}
                </span>
              </span>
            </div>
          )}
        />
      </div>

      {/* Add Role Modal */}
      <AddRoleModal
        isOpen={showAddRoleModal}
        onClose={() => setShowAddRoleModal(false)}
        user={user}
        onSuccess={refreshRoles}
      />

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={showEditUserModal}
        onClose={() => setShowEditUserModal(false)}
        user={user}
        onSuccess={refreshUserData}
      />
    </div>
  );
}

// Add Role Modal Component
function AddRoleModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUserInfo;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const [loading, setLoading] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<AdminRoleInfo[]>([]);
  const [userRoles, setUserRoles] = useState<UserRoleInfo[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Load available roles and current user roles
  const loadData = async () => {
    try {
      setLoadingData(true);
      const [allRolesResponse, currentUserRoles] = await Promise.all([
        adminApi.getRoles({ limit: 1000, offset: 0 }),
        adminApi.getUserRoles(user.id),
      ]);

      setAvailableRoles(allRolesResponse.data);
      setUserRoles(currentUserRoles);
    } catch (error) {
      console.error("Failed to load role data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  // Load data when modal opens
  React.useEffect(() => {
    if (isOpen) {
      loadData();
      setSelectedRoleId(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoleId) return;

    setLoading(true);
    try {
      await adminApi.assignUserRole(user.id, selectedRoleId);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to assign role:", error);
      alert("Failed to assign role. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Filter out roles that user already has
  const assignableRoles = availableRoles.filter(
    (role) => !userRoles.some((userRole) => userRole.role.id === role.id),
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Role" size="md">
      {loadingData ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-400">Loading roles...</div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Select Role to Add
            </label>
            {assignableRoles.length === 0 ? (
              <div className="text-gray-400 text-sm p-3 bg-slate-800 rounded border border-slate-600">
                No additional roles available to assign. User has all available
                roles.
              </div>
            ) : (
              <select
                value={selectedRoleId || ""}
                onChange={(e) =>
                  setSelectedRoleId(
                    e.target.value ? parseInt(e.target.value, 10) : null,
                  )
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
                required
              >
                <option value="">Select a role...</option>
                {assignableRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} {role.is_system_role ? "(System)" : "(Custom)"}
                    {role.description && ` - ${role.description}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedRoleId && (
            <div className="p-3 bg-slate-800 rounded border border-slate-600">
              <h4 className="text-sm font-medium text-white mb-2">
                Role Details
              </h4>
              {(() => {
                const selectedRole = assignableRoles.find(
                  (r) => r.id === selectedRoleId,
                );
                if (!selectedRole) return null;

                return (
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-400">Name:</span>{" "}
                      <span className="text-white">{selectedRole.name}</span>
                    </div>
                    {selectedRole.description && (
                      <div>
                        <span className="text-gray-400">Description:</span>{" "}
                        <span className="text-white">
                          {selectedRole.description}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-400">Type:</span>{" "}
                      <span
                        className={
                          selectedRole.is_system_role
                            ? "text-blue-400"
                            : "text-green-400"
                        }
                      >
                        {selectedRole.is_system_role
                          ? "System Role"
                          : "Custom Role"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Permissions:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {selectedRole.permissions
                          ?.slice(0, 5)
                          .map((permission, idx) => (
                            <span
                              key={idx}
                              className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-900 text-blue-300"
                            >
                              {permission}
                            </span>
                          ))}
                        {selectedRole.permissions &&
                          selectedRole.permissions.length > 5 && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-600 text-gray-300">
                              +{selectedRole.permissions.length - 5} more
                            </span>
                          )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                loading || !selectedRoleId || assignableRoles.length === 0
              }
            >
              {loading ? "Adding..." : "Add Role"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
