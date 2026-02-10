import { DocumentTextIcon, PencilIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { PaginatedTable } from "../components/PaginatedTable";
import { StatusBadge } from "../components/StatusBadge";
import { useAdminApi } from "../hooks/useAdminApi";
import type { AdminSubscriptionInfo } from "../lib/api";
import { formatCurrency } from "../utils/currency";

export function SubscriptionsPage() {
  const adminApi = useAdminApi();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<AdminSubscriptionInfo | null>(null);

  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleEdit = (sub: AdminSubscriptionInfo) => {
    setSelectedSubscription(sub);
    setShowEditModal(true);
  };

  const handleDelete = async (sub: AdminSubscriptionInfo) => {
    if (!confirm(`Are you sure you want to delete subscription "${sub.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await adminApi.deleteSubscription(sub.id);
      refreshData();
    } catch (error) {
      // Error handled by API layer
    }
  };

  const formatInterval = (amount: number, type: string) => {
    if (amount === 1) return `per ${type}`;
    return `every ${amount} ${type}s`;
  };

  const renderHeader = () => (
    <>
      <th className="w-16">ID</th>
      <th>Name</th>
      <th>User</th>
      <th>Billing</th>
      <th>Line Items</th>
      <th>Payments</th>
      <th>Expires</th>
      <th>Status</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (sub: AdminSubscriptionInfo, index: number) => (
    <tr key={sub.id || index}>
      <td className="whitespace-nowrap text-white">{sub.id}</td>
      <td>
        <div className="space-y-0.5">
          <Link to={`/subscriptions/${sub.id}`} className="font-medium text-blue-400 hover:text-blue-300">
            {sub.name}
          </Link>
          {sub.description && <div className="text-xs text-gray-400 truncate max-w-48">{sub.description}</div>}
        </div>
      </td>
      <td>
        <Link to={`/users/${sub.user_id}`} className="text-blue-400 hover:text-blue-300 text-sm">
          User #{sub.user_id}
        </Link>
      </td>
      <td>
        <div className="text-sm text-gray-300">
          <div>{formatCurrency(sub.setup_fee, sub.currency)} setup</div>
          <div className="text-xs text-gray-400">{formatInterval(sub.interval_amount, sub.interval_type)}</div>
        </div>
      </td>
      <td className="text-gray-300">{sub.line_items.length}</td>
      <td className="text-gray-300">{sub.payment_count}</td>
      <td className="text-gray-300 text-sm">
        {sub.expires ? new Date(sub.expires).toLocaleDateString() : <span className="text-gray-500">None</span>}
      </td>
      <td>
        <div className="flex gap-1">
          {sub.is_active ? (
            <StatusBadge status="active">Active</StatusBadge>
          ) : (
            <StatusBadge status="inactive">Inactive</StatusBadge>
          )}
          {sub.auto_renewal_enabled && <StatusBadge status="info">Auto-renew</StatusBadge>}
        </div>
      </td>
      <td className="text-right">
        <div className="flex justify-end gap-2">
          <Link to={`/subscriptions/${sub.id}`}>
            <Button variant="ghost" size="sm">
              <DocumentTextIcon className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => handleEdit(sub)}>
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(sub)}>
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );

  const renderEmptyState = () => (
    <div className="text-center py-12">
      <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-600" />
      <h3 className="mt-2 text-sm font-medium text-gray-300">No subscriptions</h3>
      <p className="mt-1 text-sm text-gray-500">Get started by creating a new subscription.</p>
      <div className="mt-6">
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Subscription
        </Button>
      </div>
    </div>
  );

  const calculateStats = (subscriptions: AdminSubscriptionInfo[], totalItems: number) => {
    const stats = {
      total: totalItems,
      active: subscriptions.filter((s) => s.is_active).length,
      autoRenew: subscriptions.filter((s) => s.auto_renewal_enabled).length,
    };

    return (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Subscriptions</h1>
          <div className="mt-2 flex gap-4 text-sm text-gray-400">
            <span>
              Total: <span className="text-white font-medium">{stats.total}</span>
            </span>
            <span>
              Active: <span className="text-green-400 font-medium">{stats.active}</span>
            </span>
            <span>
              Auto-renew: <span className="text-blue-400 font-medium">{stats.autoRenew}</span>
            </span>
          </div>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Subscription
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PaginatedTable
        apiCall={(params) => adminApi.getSubscriptions(params)}
        renderHeader={renderHeader}
        renderRow={renderRow}
        renderEmptyState={renderEmptyState}
        calculateStats={calculateStats}
        itemsPerPage={20}
        errorAction="view subscriptions"
        loadingMessage="Loading subscriptions..."
        dependencies={[refreshTrigger]}
        minWidth="1200px"
      />

      {showCreateModal && (
        <CreateSubscriptionModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            refreshData();
          }}
        />
      )}

      {showEditModal && selectedSubscription && (
        <EditSubscriptionModal
          subscription={selectedSubscription}
          onClose={() => {
            setShowEditModal(false);
            setSelectedSubscription(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedSubscription(null);
            refreshData();
          }}
        />
      )}
    </div>
  );
}

function CreateSubscriptionModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const adminApi = useAdminApi();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    user_id: "",
    name: "",
    description: "",
    expires: "",
    is_active: true,
    currency: "USD",
    interval_amount: 1,
    interval_type: "month" as "day" | "month" | "year",
    setup_fee: 0,
    auto_renewal_enabled: false,
    external_id: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const userId = parseInt(formData.user_id);
      if (isNaN(userId) || userId <= 0) {
        setError("Please enter a valid user ID");
        setSubmitting(false);
        return;
      }

      await adminApi.createSubscription({
        user_id: userId,
        name: formData.name,
        description: formData.description || undefined,
        expires: formData.expires || undefined,
        is_active: formData.is_active,
        currency: formData.currency,
        interval_amount: formData.interval_amount,
        interval_type: formData.interval_type,
        setup_fee: Math.round(formData.setup_fee * 100),
        auto_renewal_enabled: formData.auto_renewal_enabled,
        external_id: formData.external_id || undefined,
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create subscription");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Create Subscription" icon={PlusIcon}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">User ID</label>
          <input
            type="number"
            value={formData.user_id}
            onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
            placeholder="User ID"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Subscription name"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Description (Optional)</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Description"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Currency</label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="CAD">CAD</option>
              <option value="CHF">CHF</option>
              <option value="AUD">AUD</option>
              <option value="JPY">JPY</option>
              <option value="BTC">BTC</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Setup Fee</label>
            <input
              type="number"
              step="0.01"
              value={formData.setup_fee}
              onChange={(e) => setFormData({ ...formData, setup_fee: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Interval Amount</label>
            <input
              type="number"
              min="1"
              value={formData.interval_amount}
              onChange={(e) => setFormData({ ...formData, interval_amount: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Interval Type</label>
            <select
              value={formData.interval_type}
              onChange={(e) => setFormData({ ...formData, interval_type: e.target.value as "day" | "month" | "year" })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              <option value="day">Day</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Expires (Optional)</label>
          <input
            type="datetime-local"
            value={formData.expires}
            onChange={(e) => setFormData({ ...formData, expires: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">External ID (Optional)</label>
          <input
            type="text"
            value={formData.external_id}
            onChange={(e) => setFormData({ ...formData, external_id: e.target.value })}
            placeholder="External payment processor ID"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500"
          />
        </div>

        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm text-gray-300">Active</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.auto_renewal_enabled}
              onChange={(e) => setFormData({ ...formData, auto_renewal_enabled: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm text-gray-300">Auto-renewal</span>
          </label>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-900 rounded-lg p-3 text-red-300 text-sm">{error}</div>
        )}

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting ? "Creating..." : "Create Subscription"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditSubscriptionModal({
  subscription,
  onClose,
  onSuccess,
}: {
  subscription: AdminSubscriptionInfo;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: subscription.name,
    description: subscription.description || "",
    expires: subscription.expires ? subscription.expires.slice(0, 16) : "",
    is_active: subscription.is_active,
    currency: subscription.currency,
    interval_amount: subscription.interval_amount,
    interval_type: subscription.interval_type,
    setup_fee: subscription.setup_fee / 100,
    auto_renewal_enabled: subscription.auto_renewal_enabled,
    external_id: subscription.external_id || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await adminApi.updateSubscription(subscription.id, {
        name: formData.name,
        description: formData.description || undefined,
        expires: formData.expires ? new Date(formData.expires).toISOString() : null,
        is_active: formData.is_active,
        currency: formData.currency,
        interval_amount: formData.interval_amount,
        interval_type: formData.interval_type,
        setup_fee: Math.round(formData.setup_fee * 100),
        auto_renewal_enabled: formData.auto_renewal_enabled,
        external_id: formData.external_id || undefined,
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update subscription");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit Subscription" icon={PencilIcon}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Currency</label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="CAD">CAD</option>
              <option value="CHF">CHF</option>
              <option value="AUD">AUD</option>
              <option value="JPY">JPY</option>
              <option value="BTC">BTC</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Setup Fee</label>
            <input
              type="number"
              step="0.01"
              value={formData.setup_fee}
              onChange={(e) => setFormData({ ...formData, setup_fee: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Interval Amount</label>
            <input
              type="number"
              min="1"
              value={formData.interval_amount}
              onChange={(e) => setFormData({ ...formData, interval_amount: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Interval Type</label>
            <select
              value={formData.interval_type}
              onChange={(e) => setFormData({ ...formData, interval_type: e.target.value as "day" | "month" | "year" })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              <option value="day">Day</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Expires</label>
          <input
            type="datetime-local"
            value={formData.expires}
            onChange={(e) => setFormData({ ...formData, expires: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          />
          <p className="text-xs text-gray-400 mt-1">Leave empty for no expiration</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">External ID</label>
          <input
            type="text"
            value={formData.external_id}
            onChange={(e) => setFormData({ ...formData, external_id: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          />
        </div>

        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm text-gray-300">Active</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.auto_renewal_enabled}
              onChange={(e) => setFormData({ ...formData, auto_renewal_enabled: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm text-gray-300">Auto-renewal</span>
          </label>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-900 rounded-lg p-3 text-red-300 text-sm">{error}</div>
        )}

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting ? "Saving..." : "Save Changes"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
