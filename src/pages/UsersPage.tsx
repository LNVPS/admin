import { useState } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import { PaginatedTable } from "../components/PaginatedTable";
import { Profile } from "../components/Profile";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import {
  AdminUserInfo,
  AdminUserRole,
  getAllCountries,
  getCountryName,
} from "../lib/api";
import { PencilIcon } from "@heroicons/react/24/outline";

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
            <div
              className="text-white truncate max-w-20"
              title={getCountryName(user.country_code)}
            >
              {getCountryName(user.country_code).length > 12
                ? getCountryName(user.country_code).substring(0, 12) + "..."
                : getCountryName(user.country_code)}
            </div>
          )}
          {user.country_code && (
            <div className="font-mono text-gray-400">{user.country_code}</div>
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
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleEdit(user)}
          className="p-1"
        >
          <PencilIcon className="h-4 w-4" />
        </Button>
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

// Edit User Modal Component
function EditUserModal({
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
  const [formData, setFormData] = useState({
    email: user.email || "",
    contact_nip17: user.contact_nip17,
    contact_email: user.contact_email,
    country_code: user.country_code || "",
    billing_name: user.billing_name || "",
    billing_address_1: user.billing_address_1 || "",
    billing_address_2: user.billing_address_2 || "",
    billing_city: user.billing_city || "",
    billing_state: user.billing_state || "",
    billing_postcode: user.billing_postcode || "",
    billing_tax_id: user.billing_tax_id || "",
    admin_role: user.is_admin ? AdminUserRole.ADMIN : AdminUserRole.READ_ONLY,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates: any = {
        email: formData.email || undefined,
        contact_nip17: formData.contact_nip17,
        contact_email: formData.contact_email,
        country_code: formData.country_code || undefined,
        billing_name: formData.billing_name || undefined,
        billing_address_1: formData.billing_address_1 || undefined,
        billing_address_2: formData.billing_address_2 || undefined,
        billing_city: formData.billing_city || undefined,
        billing_state: formData.billing_state || undefined,
        billing_postcode: formData.billing_postcode || undefined,
        billing_tax_id: formData.billing_tax_id || undefined,
        admin_role:
          formData.admin_role === AdminUserRole.READ_ONLY
            ? null
            : formData.admin_role,
      };

      await adminApi.updateUser(user.id, updates);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to update user:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit User" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Country
            </label>
            <select
              value={formData.country_code}
              onChange={(e) =>
                setFormData({ ...formData, country_code: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
            >
              <option value="">Select a country...</option>
              {getAllCountries().map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name} ({country.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">
            Admin Role
          </label>
          <select
            value={formData.admin_role}
            onChange={(e) =>
              setFormData({
                ...formData,
                admin_role: e.target.value as AdminUserRole,
              })
            }
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
          >
            <option value={AdminUserRole.READ_ONLY}>Read Only</option>
            <option value={AdminUserRole.ADMIN}>Admin</option>
            <option value={AdminUserRole.SUPER_ADMIN}>Super Admin</option>
          </select>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="contact_email"
              checked={formData.contact_email}
              onChange={(e) =>
                setFormData({ ...formData, contact_email: e.target.checked })
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-slate-800 border-slate-600"
            />
            <label htmlFor="contact_email" className="ml-2 text-xs text-white">
              Contact via Email
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="contact_nip17"
              checked={formData.contact_nip17}
              onChange={(e) =>
                setFormData({ ...formData, contact_nip17: e.target.checked })
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-slate-800 border-slate-600"
            />
            <label htmlFor="contact_nip17" className="ml-2 text-xs text-white">
              Contact via Nostr (NIP-17)
            </label>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-white mb-2">
            Billing Information
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-white mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={formData.billing_name}
                onChange={(e) =>
                  setFormData({ ...formData, billing_name: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white mb-2">
                Tax ID
              </label>
              <input
                type="text"
                value={formData.billing_tax_id}
                onChange={(e) =>
                  setFormData({ ...formData, billing_tax_id: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
                placeholder="Tax ID"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-xs font-medium text-white mb-2">
                Address Line 1
              </label>
              <input
                type="text"
                value={formData.billing_address_1}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    billing_address_1: e.target.value,
                  })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
                placeholder="Address line 1"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white mb-2">
                Address Line 2
              </label>
              <input
                type="text"
                value={formData.billing_address_2}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    billing_address_2: e.target.value,
                  })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
                placeholder="Address line 2"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-xs font-medium text-white mb-2">
                City
              </label>
              <input
                type="text"
                value={formData.billing_city}
                onChange={(e) =>
                  setFormData({ ...formData, billing_city: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white mb-2">
                State
              </label>
              <input
                type="text"
                value={formData.billing_state}
                onChange={(e) =>
                  setFormData({ ...formData, billing_state: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
                placeholder="State"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white mb-2">
                Postcode
              </label>
              <input
                type="text"
                value={formData.billing_postcode}
                onChange={(e) =>
                  setFormData({ ...formData, billing_postcode: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
                placeholder="Postcode"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update User"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
