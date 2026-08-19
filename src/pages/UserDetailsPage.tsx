import {
  DocumentTextIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  PlusIcon,
  ServerIcon,
  ShieldCheckIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import * as React from "react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { AccountTypeBadge } from "../components/AccountTypeBadge";
import { Button } from "../components/Button";
import { EditUserModal } from "../components/EditUserModal";
import { Fact, FactGroup, NotSet, SectionHeading } from "../components/Facts";
import { Modal } from "../components/Modal";
import { PaginatedTable } from "../components/PaginatedTable";
import { PermissionGuard } from "../components/PermissionGuard";
import { Profile } from "../components/Profile";
import { StatusBadge } from "../components/StatusBadge";
import { UserPasskeysSection } from "../components/UserPasskeysSection";
import { UserPaymentMethodsSection } from "../components/UserPaymentMethodsSection";
import { UserTaxFacts } from "../components/UserTaxSection";
import { getVmStatus, VmStatusBadge } from "../components/VmStatusBadge";
import { useAdminApi } from "../hooks/useAdminApi";
import useLogin from "../hooks/useLogin";
import { useToast } from "../hooks/useToast";
import { useUserRoles } from "../hooks/useUserRoles";
import {
  type AdminRoleInfo,
  type AdminSubscriptionInfo,
  type AdminUserInfo,
  AdminUserRole,
  type AdminVmInfo,
  getCountryName,
  type UserRoleInfo,
  VmRunningStates,
} from "../lib/api";
import { confirmDialog } from "../services/confirmService";
import { toastService } from "../services/toastService";
import { formatCurrency } from "../utils/currency";
import { formatBytes } from "../utils/formatBytes";

export function UserDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const adminApi = useAdminApi();
  const { hasPermission, permissions, isSuperAdmin } = useUserRoles();
  const login = useLogin();
  const { success, error: showError } = useToast();

  // Get user data from navigation state
  const userFromState = location.state?.user as AdminUserInfo | undefined;
  const [user, setUser] = useState<AdminUserInfo | null>(userFromState || null);
  const [loading, setLoading] = useState(!userFromState);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [includeDeletedVms, setIncludeDeletedVms] = useState(false);
  const [showInactiveSubs, setShowInactiveSubs] = useState(false);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);

  // Parse userId from params
  const userId = id ? parseInt(id, 10) : null;

  // Role assignment/revocation is gated on `roles::update` (not `users::update`,
  // which used to be a path to granting yourself super_admin). The server also
  // refuses self-assignment outright, so the grant UI is hidden on your own user.
  const isSelf = !!login?.publicKey && !!user && user.pubkey === login.publicKey;
  const canManageRoles = hasPermission("roles::update");
  const canGrantRoles = canManageRoles && !isSelf;

  // If user data is in state, use it; otherwise fetch from API
  useEffect(() => {
    if (!userId) {
      setError("Invalid user ID");
      setLoading(false);
      return;
    }

    if (userFromState) {
      // User data was passed via state, use it
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        setLoading(true);
        const userData = await adminApi.getUser(userId);
        setUser(userData);
        setError(null);
      } catch (err) {
        console.error("Failed to load user:", err);
        setError(err instanceof Error ? err.message : "Failed to load user");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId, userFromState, adminApi]);

  const refreshRoles = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const refreshUserData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleRemoveRole = async (roleId: number, roleName: string) => {
    if (
      await confirmDialog({
        title: "Remove Role",
        message: `Are you sure you want to remove the "${roleName}" role from this user?`,
      })
    ) {
      try {
        await adminApi.revokeUserRole(user.id, roleId);
        refreshRoles();
      } catch (error) {
        console.error("Failed to remove role:", error);
        toastService.error("Failed to remove role", "Please try again.");
      }
    }
  };

  const renderVMHeader = () => (
    <>
      <th className="w-14">ID</th>
      <th>Instance</th>
      <th>Resources &amp; Status</th>
      <th>Host</th>
      <th>Dates</th>
    </>
  );

  const renderVMRow = (vm: AdminVmInfo, index: number) => (
    <tr key={vm.id || index} className={`hover:bg-slate-700 ${vm.deleted ? "bg-gray-800/50 opacity-75" : ""}`}>
      <td className="whitespace-nowrap align-top font-mono">
        <Link to={`/vms/${vm.id}`} className="text-blue-400 hover:text-blue-300">
          #{vm.id}
        </Link>
      </td>
      {/* Instance: image · template */}
      <td className="align-top">
        <div className="min-w-0 max-w-[18rem]">
          <div className="truncate text-gray-300" title={vm.image_name}>
            {vm.image_name}
          </div>
          {vm.template_name && (
            <div className="mt-0.5 truncate text-xs text-gray-400" title={vm.template_name}>
              {vm.template_name}
            </div>
          )}
        </div>
      </td>
      {/* Resources & status */}
      <td className="align-top">
        <VmStatusBadge vm={vm} />
        <div className="mt-1 font-mono text-xs text-gray-400">
          {vm.cpu}C • {formatBytes(vm.memory)} • {formatBytes(vm.disk_size)}
        </div>
      </td>
      <td className="align-top">
        <div className="min-w-0 max-w-[12rem] truncate text-gray-300" title={vm.host_name || `#${vm.host_id}`}>
          {vm.host_name || `#${vm.host_id}`}
        </div>
      </td>
      {/* Dates: created + expires */}
      <td className="align-top text-gray-400 text-sm">
        <div>Created {new Date(vm.created).toLocaleDateString()}</div>
        <div
          className={
            new Date(vm.expires) < new Date()
              ? "text-red-400"
              : new Date(vm.expires).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000
                ? "text-yellow-400"
                : "text-gray-400"
          }
        >
          Expires {new Date(vm.expires).toLocaleDateString()}
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
      <td className="align-top font-semibold text-blue-400">{roleInfo.role.name}</td>
      <td className="align-top text-gray-300">
        <div className="min-w-0 max-w-[20rem] break-words">{roleInfo.role.description || "No description"}</div>
      </td>
      <td className="align-top text-gray-300">
        <div className="flex max-w-[24rem] flex-wrap gap-1">
          {roleInfo.role.permissions && roleInfo.role.permissions.length > 0 ? (
            <>
              {roleInfo.role.permissions.slice(0, 3).map((permission: string, idx: number) => (
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
      <td className="align-top">
        <StatusBadge status={roleInfo.role.is_system_role ? "running" : "unknown"}>
          {roleInfo.role.is_system_role ? "System" : "Custom"}
        </StatusBadge>
      </td>
      {canManageRoles && (
        <td className="align-top text-right">
          {/* Only a super admin may revoke super_admin (the server returns 403 otherwise). */}
          <Button
            size="sm"
            variant="secondary"
            disabled={roleInfo.role.name === AdminUserRole.SUPER_ADMIN && !isSuperAdmin}
            onClick={() => handleRemoveRole(roleInfo.role.id, roleInfo.role.name)}
            className="text-red-400 hover:text-red-300 p-1"
            title={
              roleInfo.role.name === AdminUserRole.SUPER_ADMIN && !isSuperAdmin
                ? "Only a super admin can revoke super_admin"
                : "Remove Role"
            }
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </td>
      )}
    </tr>
  );

  const formatInterval = (amount: number, type: string) => (amount === 1 ? `per ${type}` : `every ${amount} ${type}s`);

  const renderSubHeader = () => (
    <>
      <th className="w-14">ID</th>
      <th>Name</th>
      <th>Billing</th>
      <th>Status</th>
      <th>Expires</th>
    </>
  );

  const renderSubRow = (sub: AdminSubscriptionInfo, index: number) => (
    <tr
      key={sub.id || index}
      className="cursor-pointer hover:bg-slate-700"
      onClick={() => navigate(`/subscriptions/${sub.id}`)}
    >
      <td className="whitespace-nowrap align-top font-mono text-blue-400">#{sub.id}</td>
      <td className="align-top">
        <div className="min-w-0 max-w-[18rem]">
          <Link
            to={`/subscriptions/${sub.id}`}
            onClick={(e) => e.stopPropagation()}
            className="block truncate font-medium text-blue-400 hover:text-blue-300"
            title={sub.name}
          >
            {sub.name}
          </Link>
          {sub.description && (
            <div className="truncate text-xs text-gray-400" title={sub.description}>
              {sub.description}
            </div>
          )}
        </div>
      </td>
      <td className="align-top text-gray-300">
        <div className="tabular-nums">
          {formatCurrency(
            sub.line_items.reduce((total, item) => total + item.amount, 0),
            sub.currency,
          )}{" "}
          <span className="text-xs text-gray-400">{formatInterval(sub.interval_amount, sub.interval_type)}</span>
        </div>
      </td>
      <td className="align-top">
        <div className="flex flex-wrap gap-1">
          {sub.is_active ? (
            <StatusBadge status="active">Active</StatusBadge>
          ) : (
            <StatusBadge status="inactive">Inactive</StatusBadge>
          )}
          {sub.auto_renewal_enabled && <StatusBadge status="info">Auto-renew</StatusBadge>}
        </div>
      </td>
      <td className="align-top text-gray-400 text-sm">
        {sub.expires ? new Date(sub.expires).toLocaleDateString() : <span className="text-gray-500">No expiry</span>}
      </td>
    </tr>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-gray-400">Loading user details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-4">⚠️ Error</div>
          <div className="text-gray-300 mb-4">Failed to load user details</div>
          <div className="text-gray-400 mb-6">{error}</div>
          <Link to="/users">
            <Button variant="primary">Back to Users List</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-4">⚠️ User Not Found</div>
          <div className="text-gray-300 mb-6">The user with this ID does not exist.</div>
          <Link to="/users">
            <Button variant="primary">Back to Users List</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* One record, top to bottom: identity, then the facts that hang off it.
          The identity was a 200px card and then a floating header row; as the
          panel's own top band it costs one line and anchors everything under
          it. Band labels sit in a left gutter, so a three-band record spends no
          lines at all on headings. */}
      <div className="rounded-lg border border-slate-700 bg-slate-800">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-700 px-3 py-2">
          <Profile pubkey={user.pubkey} avatarSize="sm" />
          <span className="font-mono text-xs text-slate-500">#{user.id}</span>
          <AccountTypeBadge accountType={user.account_type} />
          <span className="text-xs text-slate-500">joined {new Date(user.created).toLocaleDateString()}</span>
          {/* The npub beside the avatar is for a nostr client; this is the key
              every API call and database row uses. Truncated to hold the row to
              one line — the full value is still in the DOM, so selecting it
              copies all 64 characters. */}
          <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-600" title={user.pubkey}>
            {user.pubkey}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <PermissionGuard requiredPermissions={["users::update"]}>
              <Button size="sm" onClick={() => setShowEditUserModal(true)} className="flex items-center gap-1.5">
                <PencilIcon className="h-3.5 w-3.5" />
                <span>Edit</span>
              </Button>
            </PermissionGuard>
            <PermissionGuard requiredPermissions={["users::delete"]}>
              <Button
                size="sm"
                variant="danger"
                onClick={() => setShowDeleteUserModal(true)}
                className="flex items-center gap-1.5"
              >
                <TrashIcon className="h-3.5 w-3.5" />
                <span>Delete</span>
              </Button>
            </PermissionGuard>
            <Link to="/users" className="text-xs text-slate-400 hover:text-slate-200">
              All users
            </Link>
          </div>
        </div>
        <FactGroup label="Contact">
          <Fact label="Email">
            {user.email ? <span className="break-all">{user.email}</span> : <NotSet>Not provided</NotSet>}
          </Fact>
          <Fact label="Methods">
            <span className="flex flex-wrap gap-1.5">
              {user.email_verified ? (
                <StatusBadge status="running">Email verified</StatusBadge>
              ) : (
                <StatusBadge status="stopped">Email unverified</StatusBadge>
              )}
              {user.contact_nip17 && <StatusBadge status="running">NIP-17</StatusBadge>}
              {user.contact_email && <StatusBadge status="running">Email contact</StatusBadge>}
              {!user.email_verified && !user.contact_nip17 && !user.contact_email && <NotSet>None enabled</NotSet>}
            </span>
          </Fact>
        </FactGroup>

        <FactGroup label="Billing">
          <Fact label="Country">{user.country_code ? getCountryName(user.country_code) : <NotSet />}</Fact>
          <Fact label="Name">{user.billing_name || <NotSet>Not provided</NotSet>}</Fact>
          <Fact label="Tax ID" mono>
            {user.billing_tax_id || <NotSet />}
          </Fact>
          {user.billing_address_1 && (
            <Fact label="Address" span>
              {[
                user.billing_address_1,
                user.billing_address_2,
                [user.billing_city, user.billing_state, user.billing_postcode].filter(Boolean).join(", "),
              ]
                .filter(Boolean)
                .join(" · ")}
            </Fact>
          )}
          {/* Place-of-supply evidence captured from the connection, kept beside
              the country it corroborates or contradicts. */}
          <Fact label="Geo">
            {user.geo_country_code || user.geo_ip || user.geo_updated ? (
              <span className="flex flex-wrap items-baseline gap-x-2 text-slate-300">
                {user.geo_country_code && <span>{getCountryName(user.geo_country_code)}</span>}
                {user.geo_ip && <span className="break-all font-mono text-xs text-slate-400">{user.geo_ip}</span>}
                {user.geo_updated && (
                  <span className="text-xs text-slate-500" title={new Date(user.geo_updated).toLocaleString()}>
                    {new Date(user.geo_updated).toLocaleDateString()}
                  </span>
                )}
              </span>
            ) : (
              <NotSet />
            )}
          </Fact>
        </FactGroup>

        {/* Last in the record because it is decided by the two groups above. */}
        <UserTaxFacts userId={user.id} />
      </div>

      {/* User's VMs */}
      <div className="space-y-2">
        <SectionHeading
          icon={<ServerIcon className="h-4 w-4 text-slate-500" />}
          action={
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                checked={includeDeletedVms}
                onChange={(e) => setIncludeDeletedVms(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Include deleted
            </label>
          }
        >
          Virtual machines
        </SectionHeading>
        <PaginatedTable
          apiCall={(params) =>
            adminApi.getVMs({
              ...params,
              user_id: user.id,
              include_deleted: includeDeletedVms ? true : undefined,
            })
          }
          renderHeader={renderVMHeader}
          renderRow={renderVMRow}
          itemsPerPage={10}
          errorAction="load user VMs"
          loadingMessage="Loading user VMs..."
          minWidth="760px"
          dependencies={[user.id, refreshTrigger, includeDeletedVms]}
          calculateStats={(vms, total) => {
            const stats = {
              total,
              running: vms.filter((vm) => getVmStatus(vm) === VmRunningStates.RUNNING).length,
              stopped: vms.filter((vm) => getVmStatus(vm) === VmRunningStates.STOPPED).length,
              new: vms.filter((vm) => getVmStatus(vm) === "new").length,
              deleted: vms.filter((vm) => vm.deleted).length,
            };

            return (
              <div className="flex gap-4 text-sm text-gray-400">
                <span>
                  Total VMs: <span className="text-white font-medium">{stats.total}</span>
                </span>
                <span>
                  Running: <span className="text-green-400 font-medium">{stats.running}</span>
                </span>
                <span>
                  Stopped: <span className="text-red-400 font-medium">{stats.stopped}</span>
                </span>
                {stats.new > 0 && (
                  <span>
                    New: <span className="text-yellow-400 font-medium">{stats.new}</span>
                  </span>
                )}
                {stats.deleted > 0 && (
                  <span>
                    Deleted: <span className="text-gray-400 font-medium">{stats.deleted}</span>
                  </span>
                )}
              </div>
            );
          }}
        />
      </div>

      {/* User's Subscriptions */}
      <PermissionGuard requiredPermissions={["subscriptions::view"]}>
        <div className="space-y-2">
          <SectionHeading
            icon={<DocumentTextIcon className="h-4 w-4 text-slate-500" />}
            action={
              <>
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={showInactiveSubs}
                    onChange={(e) => setShowInactiveSubs(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Show inactive
                </label>
                <Link to={`/subscriptions?user_id=${user.id}`} className="text-blue-400 hover:text-blue-300">
                  View all →
                </Link>
              </>
            }
          >
            Subscriptions
          </SectionHeading>
          <PaginatedTable
            apiCall={(params) =>
              adminApi.getSubscriptions({
                ...params,
                user_id: user.id,
                status: showInactiveSubs ? undefined : "active",
              })
            }
            renderHeader={renderSubHeader}
            renderRow={renderSubRow}
            itemsPerPage={10}
            errorAction="load user subscriptions"
            loadingMessage="Loading subscriptions..."
            minWidth="640px"
            inlineError={true}
            dependencies={[user.id, refreshTrigger, showInactiveSubs]}
            renderEmptyState={() => (
              <div className="text-center py-8 text-gray-400">No subscriptions for this user</div>
            )}
            calculateStats={(subs, total) => (
              <div className="flex gap-4 text-sm text-gray-400">
                <span>
                  Total: <span className="text-white font-medium">{total}</span>
                </span>
                <span>
                  Active: <span className="text-green-400 font-medium">{subs.filter((s) => s.is_active).length}</span>
                </span>
              </div>
            )}
          />
        </div>
      </PermissionGuard>

      {/* User's Saved Payment Methods */}
      <PermissionGuard requiredPermissions={["user_payment_method::view"]} fallback={<></>}>
        <UserPaymentMethodsSection userId={user.id} />
      </PermissionGuard>

      {/* User's Passkeys */}
      <PermissionGuard requiredPermissions={["users::view"]} fallback={<></>}>
        <UserPasskeysSection userId={user.id} />
      </PermissionGuard>

      {/* User's Roles */}
      <div className="space-y-2">
        <SectionHeading
          icon={<ShieldCheckIcon className="h-4 w-4 text-slate-500" />}
          action={
            <>
              {canManageRoles && isSelf && <span>You cannot assign a role to your own account</span>}
              {canGrantRoles && (
                <Button size="sm" onClick={() => setShowAddRoleModal(true)} className="flex items-center gap-1.5">
                  <PlusIcon className="h-3.5 w-3.5" />
                  <span>Add role</span>
                </Button>
              )}
            </>
          }
        >
          Roles &amp; permissions
        </SectionHeading>
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
          minWidth="700px"
          dependencies={[user.id, refreshTrigger]}
          calculateStats={(roles, total) => (
            <div className="flex gap-4 text-sm text-gray-400">
              <span>
                Total roles: <span className="text-white font-medium">{total}</span>
              </span>
              <span>
                System roles:{" "}
                <span className="text-blue-400 font-medium">{roles.filter((r) => r.role.is_system_role).length}</span>
              </span>
              <span>
                Custom roles:{" "}
                <span className="text-green-400 font-medium">{roles.filter((r) => !r.role.is_system_role).length}</span>
              </span>
            </div>
          )}
        />
      </div>

      {/* Add Role Modal */}
      <AddRoleModal
        callerPermissions={permissions}
        callerIsSuperAdmin={isSuperAdmin}
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

      {/* Delete User Modal */}
      <DeleteUserModal
        isOpen={showDeleteUserModal}
        onClose={() => setShowDeleteUserModal(false)}
        user={user}
        onDeleted={() => {
          success("User permanently deleted");
          navigate("/users");
        }}
        onError={(message) => showError("Failed to delete user", message)}
      />
    </div>
  );
}

/**
 * Why the caller may not grant `role`, or null when they may.
 *
 * Mirrors the server's rules on `POST /users/{id}/roles` so an impossible grant
 * is not offered: only a super admin can hand out `super_admin`, and a role may
 * not carry permissions the caller does not already hold.
 */
function ungrantableReason(
  role: AdminRoleInfo,
  callerPermissions: string[],
  callerIsSuperAdmin: boolean,
): string | null {
  if (role.name === AdminUserRole.SUPER_ADMIN && !callerIsSuperAdmin) {
    return "super admin only";
  }
  if (callerIsSuperAdmin) return null;
  const missing = (role.permissions ?? []).filter((permission) => !callerPermissions.includes(permission));
  return missing.length > 0 ? `grants permissions you lack: ${missing.slice(0, 3).join(", ")}` : null;
}

// Add Role Modal Component
function AddRoleModal({
  isOpen,
  onClose,
  user,
  onSuccess,
  callerPermissions,
  callerIsSuperAdmin,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUserInfo;
  onSuccess: () => void;
  callerPermissions: string[];
  callerIsSuperAdmin: boolean;
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
      toastService.error("Failed to assign role", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Filter out roles that user already has
  const assignableRoles = availableRoles.filter((role) => !userRoles.some((userRole) => userRole.role.id === role.id));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Role" size="md">
      {loadingData ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-400">Loading roles...</div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">Select Role to Add</label>
            {assignableRoles.length === 0 ? (
              <div className="text-gray-400 text-sm p-3 bg-slate-800 rounded border border-slate-600">
                No additional roles available to assign. User has all available roles.
              </div>
            ) : (
              <select
                value={selectedRoleId || ""}
                onChange={(e) => setSelectedRoleId(e.target.value ? parseInt(e.target.value, 10) : null)}
                className=""
                required
              >
                <option value="">Select a role...</option>
                {assignableRoles.map((role) => {
                  const blocked = ungrantableReason(role, callerPermissions, callerIsSuperAdmin);
                  return (
                    <option key={role.id} value={role.id} disabled={blocked !== null}>
                      {role.name} {role.is_system_role ? "(System)" : "(Custom)"}
                      {blocked ? ` — ${blocked}` : role.description ? ` - ${role.description}` : ""}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {selectedRoleId && (
            <div className="p-3 bg-slate-800 rounded border border-slate-600">
              <h4 className="text-sm font-medium text-white mb-2">Role Details</h4>
              {(() => {
                const selectedRole = assignableRoles.find((r) => r.id === selectedRoleId);
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
                        <span className="text-white">{selectedRole.description}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-400">Type:</span>{" "}
                      <span className={selectedRole.is_system_role ? "text-blue-400" : "text-green-400"}>
                        {selectedRole.is_system_role ? "System Role" : "Custom Role"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Permissions:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {selectedRole.permissions?.slice(0, 5).map((permission, idx) => (
                          <span
                            key={idx}
                            className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-900 text-blue-300"
                          >
                            {permission}
                          </span>
                        ))}
                        {selectedRole.permissions && selectedRole.permissions.length > 5 && (
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
            <Button type="submit" disabled={loading || !selectedRoleId || assignableRoles.length === 0}>
              {loading ? "Adding..." : "Add Role"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// Delete User Modal Component — hard-deletes a user and ALL of their data.
function DeleteUserModal({
  isOpen,
  onClose,
  user,
  onDeleted,
  onError,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUserInfo;
  onDeleted: () => void;
  onError: (message: string | undefined) => void;
}) {
  const adminApi = useAdminApi();
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  // Require typing the user id to arm the irreversible action.
  const confirmationValue = String(user.id);
  const canDelete = confirmText.trim() === confirmationValue && !loading;

  // Reset the confirmation field whenever the modal opens.
  React.useEffect(() => {
    if (isOpen) setConfirmText("");
  }, [isOpen]);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await adminApi.deleteUser(user.id);
      onClose();
      onDeleted();
    } catch (error) {
      console.error("Failed to delete user:", error);
      onError(error instanceof Error ? error.message : undefined);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete User" size="md">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-red-500/40 bg-red-500/10 p-4">
          <ExclamationTriangleIcon className="h-6 w-6 shrink-0 text-red-400" />
          <div className="space-y-2 text-sm text-red-200">
            <p className="font-semibold text-red-300">This action is permanent and cannot be undone.</p>
            <p>
              All data belonging to user <span className="font-mono">#{user.id}</span> will be{" "}
              <span className="font-semibold">hard deleted</span>, including VMs and their history, IP and firewall
              records, custom templates, SSH keys, passkeys, subscriptions, payments, saved payment methods, referral
              records and Nostr domains.
            </p>
            <p>Users with live (non-deleted) VMs cannot be purged — delete those VMs first.</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">
            Type the user ID <span className="font-mono text-red-300">{confirmationValue}</span> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={confirmationValue}
            autoComplete="off"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={handleDelete} disabled={!canDelete}>
            {loading ? "Deleting..." : "Permanently Delete User"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
