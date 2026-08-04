import { PencilIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useCallback, useMemo, useState } from "react";
import { Button } from "../components/Button";
import { countActiveFilters, FilterBar, FilterButton, type FilterField } from "../components/FilterBar";
import { Modal } from "../components/Modal";
import { PaginatedTable } from "../components/PaginatedTable";
import { StatsHeader } from "../components/StatsHeader";
import { useAdminApi } from "../hooks/useAdminApi";
import { useApiCall } from "../hooks/useApiCall";
import { useUserRoles } from "../hooks/useUserRoles";
import type { AdminRoleInfo, PaginatedApiResponse } from "../lib/api";
import { confirmDialog } from "../services/confirmService";
import { toastService } from "../services/toastService";

export function RolesPage() {
  const adminApi = useAdminApi();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AdminRoleInfo | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filter states
  const [resourceFilter, setResourceFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Load all roles once and cache them
  const {
    data: rolesResponse,
    loading: rolesLoading,
    error: rolesError,
  } = useApiCall(() => adminApi.getRoles({ limit: 1000, offset: 0 }), [refreshTrigger]);

  const allRoles = rolesResponse?.data || [];

  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // Extract unique resources and actions from available permissions
  const getUniqueResources = () => {
    const resources = new Set<string>();
    AVAILABLE_PERMISSIONS.forEach((permission) => {
      const [resource] = permission.split("::");
      if (resource) resources.add(resource);
    });
    return Array.from(resources).sort();
  };

  const getUniqueActions = () => {
    const actions = new Set<string>();
    AVAILABLE_PERMISSIONS.forEach((permission) => {
      const [, action] = permission.split("::");
      if (action) actions.add(action);
    });
    return Array.from(actions).sort();
  };

  // Memoized filtered roles to avoid recalculating on every render
  const filteredRoles = useMemo(() => {
    if (!resourceFilter && !actionFilter) {
      return allRoles;
    }

    return allRoles.filter((role) => {
      if (!role.permissions || role.permissions.length === 0) {
        return false;
      }

      return role.permissions.some((permission) => {
        const [resource, action] = permission.split("::");
        const matchesResource = !resourceFilter || resource === resourceFilter;
        const matchesAction = !actionFilter || action === actionFilter;
        return matchesResource && matchesAction;
      });
    });
  }, [allRoles, resourceFilter, actionFilter]);

  // Create a wrapper API function that returns filtered results
  const filteredApiCall = useCallback(
    async (params: { limit: number; offset: number }): Promise<PaginatedApiResponse<AdminRoleInfo>> => {
      // Apply pagination to filtered results
      const startIndex = params.offset;
      const endIndex = startIndex + params.limit;
      const paginatedData = filteredRoles.slice(startIndex, endIndex);

      return {
        data: paginatedData,
        total: filteredRoles.length,
        limit: params.limit,
        offset: params.offset,
      };
    },
    [filteredRoles],
  );

  const clearFilters = () => {
    setResourceFilter("");
    setActionFilter("");
  };

  const hasActiveFilters = resourceFilter || actionFilter;

  const filterFields: FilterField[] = [
    {
      kind: "select",
      key: "resource",
      label: "Resource",
      value: resourceFilter,
      onChange: setResourceFilter,
      options: [
        { value: "", label: "All resources" },
        ...getUniqueResources().map((resource) => ({ value: resource, label: resource })),
      ],
    },
    {
      kind: "select",
      key: "action",
      label: "Action",
      value: actionFilter,
      onChange: setActionFilter,
      options: [
        { value: "", label: "All actions" },
        ...getUniqueActions().map((action) => ({ value: action, label: action })),
      ],
    },
  ];

  const handleEdit = (role: AdminRoleInfo) => {
    setSelectedRole(role);
    setShowEditModal(true);
  };

  const handleDelete = async (role: AdminRoleInfo) => {
    if (role.is_system_role) {
      toastService.error("Cannot delete role", "System roles cannot be deleted.");
      return;
    }

    if (await confirmDialog({ title: "Delete Role", message: `Are you sure you want to delete role "${role.name}"?` })) {
      try {
        await adminApi.deleteRole(role.id);
        refreshData();
      } catch (error) {
        console.error("Failed to delete role:", error);
      }
    }
  };

  const renderHeader = () => (
    <>
      <th className="w-12">ID</th>
      <th>Role</th>
      <th>Permissions</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (role: AdminRoleInfo, index: number) => (
    <tr key={role.id || index}>
      <td className="whitespace-nowrap align-top font-mono text-white">{role.id}</td>
      {/* Role: name + description */}
      <td className="align-top">
        <div className="min-w-0 max-w-[22rem]">
          <div className="truncate font-medium text-slate-100" title={role.name}>
            {role.name}
            {role.is_system_role && <span className="ml-1.5 text-xs text-slate-400">(system)</span>}
          </div>
          <div className="mt-0.5 truncate text-xs text-slate-400" title={role.description || undefined}>
            {role.description || "No description"}
          </div>
        </div>
      </td>
      <td className="align-top text-gray-300">
        <div className="flex max-w-[22rem] flex-wrap gap-1">
          {role.permissions && role.permissions.length > 0 ? (
            <>
              {role.permissions.slice(0, 3).map((permission: string, idx: number) => (
                <span
                  key={idx}
                  className="inline-flex max-w-[12rem] truncate px-2 py-0.5 font-mono text-xs rounded-full bg-blue-900 text-blue-300"
                  title={permission}
                >
                  {permission}
                </span>
              ))}
              {role.permissions.length > 3 && (
                <span className="inline-flex px-2 py-0.5 font-semibold text-xs rounded-full bg-gray-600 text-gray-300">
                  +{role.permissions.length - 3} more
                </span>
              )}
            </>
          ) : (
            <span className="text-gray-500">No permissions</span>
          )}
        </div>
      </td>
      <td className="text-right align-top">
        <div className="flex justify-end space-x-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleEdit(role)}
            className="p-1"
            disabled={role.is_system_role}
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleDelete(role)}
            className="text-red-400 hover:text-red-300 p-1"
            disabled={role.is_system_role}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
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
      <StatsHeader
        title="Roles"
        stats={[
          { label: "Total", value: stats.total },
          { label: "System", value: stats.systemRoles, tone: "accent" },
          { label: "Custom", value: stats.customRoles, tone: "success" },
        ]}
        actions={
          <>
            <FilterButton
              open={showFilters}
              activeCount={countActiveFilters(filterFields)}
              onClick={() => setShowFilters(!showFilters)}
            />
            <Button onClick={() => setShowCreateModal(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Role
            </Button>
          </>
        }
      />
    );
  };

  // Handle initial loading and error states
  if (rolesLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-white">Loading roles...</div>
      </div>
    );
  }

  if (rolesError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Failed to load roles</p>
          <Button onClick={() => setRefreshTrigger((prev) => prev + 1)}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PaginatedTable
        apiCall={filteredApiCall}
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
        itemsPerPage={25}
        errorAction="view roles"
        loadingMessage="Applying filters..."
        dependencies={[resourceFilter, actionFilter]}
        minWidth="720px"
        renderEmptyState={() => (
          <div className="text-center py-8">
            <p className="text-gray-400">
              {hasActiveFilters ? "No roles match the selected filters" : "No roles found"}
            </p>
          </div>
        )}
      />

      {/* Create Role Modal */}
      <CreateRoleModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSuccess={refreshData} />

      {/* Edit Role Modal */}
      {selectedRole && (
        <EditRoleModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedRole(null);
          }}
          role={selectedRole}
          onSuccess={refreshData}
        />
      )}
    </div>
  );
}

// Available permissions - this could be dynamic from API
/**
 * Assignable `resource::action` permissions, mirroring the API's `AdminResource`
 * / `AdminAction` enums (see ADMIN_API_ENDPOINTS.md → Available Permissions).
 */
const AVAILABLE_PERMISSIONS = [
  "users::view",
  "users::create",
  "users::update",
  "users::delete",
  "virtual_machines::view",
  "virtual_machines::create",
  "virtual_machines::update",
  "virtual_machines::delete",
  "virtual_machines::bulk_update",
  "hosts::view",
  "hosts::create",
  "hosts::update",
  "hosts::delete",
  "payments::view",
  "analytics::view",
  "system::view",
  "roles::view",
  "roles::create",
  "roles::update",
  "roles::delete",
  "audit::view",
  "access_policy::view",
  "access_policy::create",
  "access_policy::update",
  "access_policy::delete",
  "company::view",
  "company::create",
  "company::update",
  "company::delete",
  "ip_range::view",
  "ip_range::create",
  "ip_range::update",
  "ip_range::delete",
  "router::view",
  "router::create",
  "router::update",
  "router::delete",
  "vm_custom_pricing::view",
  "vm_custom_pricing::create",
  "vm_custom_pricing::update",
  "vm_custom_pricing::delete",
  "vm_os_image::view",
  "vm_os_image::create",
  "vm_os_image::update",
  "vm_os_image::delete",
  "vm_template::view",
  "vm_template::create",
  "vm_template::update",
  "vm_template::delete",
  "vm_payment::view",
  "vm_payment::create",
  "vm_payment::update",
  "vm_payment::delete",
  "host_region::view",
  "host_region::create",
  "host_region::update",
  "host_region::delete",
  "dns_server::view",
  "dns_server::create",
  "dns_server::update",
  "dns_server::delete",
  "ip_space::view",
  "ip_space::create",
  "ip_space::update",
  "ip_space::delete",
  "subscriptions::view",
  "subscriptions::create",
  "subscriptions::update",
  "subscriptions::delete",
  "subscription_line_items::view",
  "subscription_line_items::create",
  "subscription_line_items::update",
  "subscription_line_items::delete",
  "subscription_payments::view",
  "subscription_payments::create",
  "subscription_payments::update",
  "subscription_payments::delete",
  "payment_method_config::view",
  "payment_method_config::create",
  "payment_method_config::update",
  "payment_method_config::delete",
  "user_payment_method::view",
  "user_payment_method::update",
  "user_payment_method::delete",
  "resource_cost::view",
  "resource_cost::create",
  "resource_cost::update",
  "resource_cost::delete",
  "referral::view",
  "referral::create",
  "referral::update",
  "referral::delete",
  "app::view",
  "app::create",
  "app::update",
  "app::delete",
  "app_deployment::view",
  "app_deployment::update",
  "app_deployment::delete",
];

/**
 * Checkbox grid for a role's permissions.
 *
 * The API refuses to create or update a role holding permissions the caller
 * does not themselves have — that check exists because editing a role you hold
 * is otherwise a self-escalation path. Mirroring it here means the constraint is
 * visible up front rather than arriving as a rejected submit. Super admins hold
 * everything implicitly and are unrestricted.
 *
 * Permissions the caller cannot grant are shown disabled with an explanation,
 * not hidden: on an existing role they may already be set, and silently
 * dropping them on save would quietly strip the role.
 */
function PermissionPicker({
  idPrefix,
  selected,
  onToggle,
}: {
  idPrefix: string;
  selected: string[];
  onToggle: (permission: string) => void;
}) {
  const { hasPermission, isSuperAdmin } = useUserRoles();
  const canGrant = (permission: string) => isSuperAdmin || hasPermission(permission);
  const blocked = AVAILABLE_PERMISSIONS.filter((p) => !canGrant(p)).length;

  return (
    <div>
      <label className="block text-xs font-medium text-white mb-2">Permissions</label>
      <div className="max-h-60 overflow-y-auto border border-slate-600 rounded p-3 bg-slate-800">
        <div className="grid grid-cols-2 gap-2">
          {AVAILABLE_PERMISSIONS.map((permission) => {
            const grantable = canGrant(permission);
            return (
              <div key={permission} className="flex items-center">
                <input
                  type="checkbox"
                  id={`${idPrefix}-${permission}`}
                  checked={selected.includes(permission)}
                  onChange={() => onToggle(permission)}
                  disabled={!grantable}
                  className=""
                />
                <label
                  htmlFor={`${idPrefix}-${permission}`}
                  className={`ml-2 text-xs font-mono ${grantable ? "text-white" : "text-gray-500"}`}
                  title={grantable ? undefined : "You cannot grant a permission you do not hold yourself"}
                >
                  {permission}
                </label>
              </div>
            );
          })}
        </div>
      </div>
      {blocked > 0 && (
        <p className="mt-2 text-xs text-gray-400">
          {blocked} permission{blocked === 1 ? " is" : "s are"} greyed out because you do not hold
          {blocked === 1 ? " it" : " them"} yourself.
        </p>
      )}
    </div>
  );
}


// Create Role Modal Component
function CreateRoleModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await adminApi.createRole({
        name: formData.name,
        description: formData.description || undefined,
        permissions: formData.permissions,
      });
      onSuccess();
      onClose();
      setFormData({ name: "", description: "", permissions: [] });
    } catch (error) {
      // Surfaced, not just logged: the API rejects a role holding permissions
      // the caller lacks, and that message names them. Swallowing it made the
      // form look like it had done nothing.
      console.error("Failed to create role:", error);
      toastService.error(error instanceof Error ? error.message : "Failed to create role");
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permission: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Role" size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-white mb-2">Role Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className=""
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className=""
            rows={3}
          />
        </div>

        <PermissionPicker idPrefix="create" selected={formData.permissions} onToggle={togglePermission} />

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Role"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Edit Role Modal Component
function EditRoleModal({
  isOpen,
  onClose,
  role,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  role: AdminRoleInfo;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: role.name,
    description: role.description || "",
    permissions: role.permissions || [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await adminApi.updateRole(role.id, {
        name: formData.name,
        description: formData.description || undefined,
        permissions: formData.permissions,
      });
      onSuccess();
      onClose();
    } catch (error) {
      // See CreateRoleModal: the permission-subset rejection has to be visible.
      console.error("Failed to update role:", error);
      toastService.error(error instanceof Error ? error.message : "Failed to update role");
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permission: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Role" size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-white mb-2">Role Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className=""
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className=""
            rows={3}
          />
        </div>

        <PermissionPicker idPrefix="edit" selected={formData.permissions} onToggle={togglePermission} />

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update Role"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
