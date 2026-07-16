import { DocumentTextIcon, PencilIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../components/Button";
import { countActiveFilters, FilterBar, FilterButton, type FilterField } from "../components/FilterBar";
import { Modal } from "../components/Modal";
import { PaginatedTable } from "../components/PaginatedTable";
import { Profile } from "../components/Profile";
import { StatsHeader } from "../components/StatsHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useAdminApi } from "../hooks/useAdminApi";
import type { AdminSubscriptionInfo } from "../lib/api";
import { formatCurrency } from "../utils/currency";

export function SubscriptionsPage() {
  const adminApi = useAdminApi();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<AdminSubscriptionInfo | null>(null);

  const [subIdInput, setSubIdInput] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  const [filters, setFilters] = useState({
    user_id: searchParams.get("user_id") ?? "",
    search: searchParams.get("search") ?? "",
    // Baseline is active-only; checking "Show inactive" widens to include inactive subscriptions.
    show_inactive: (searchParams.get("show_inactive") ?? "") as "" | "true",
    auto_renewal: (searchParams.get("auto_renewal") ?? "") as "" | "true" | "false",
  });

  // Mirror a filter into the URL so a filtered list is shareable / deep-linkable.
  const syncParam = (key: string, value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  };

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    syncParam(key, value);
  };

  // Debounce the free-text search so we don't fire a request per keystroke.
  useEffect(() => {
    const handle = setTimeout(() => {
      setFilters((prev) => (prev.search === searchInput ? prev : { ...prev, search: searchInput }));
      syncParam("search", searchInput);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const clearFilters = () => {
    setFilters({ user_id: "", search: "", show_inactive: "", auto_renewal: "" });
    setSearchInput("");
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const k of ["user_id", "search", "show_inactive", "auto_renewal"]) {
          next.delete(k);
        }
        return next;
      },
      { replace: true },
    );
    setRefreshTrigger((prev) => prev + 1);
  };

  const filterFields: FilterField[] = [
    {
      kind: "number",
      key: "user_id",
      label: "User ID",
      value: filters.user_id,
      placeholder: "Filter by user ID",
      onChange: (value) => handleFilterChange("user_id", value),
    },
    {
      kind: "select",
      key: "auto_renewal",
      label: "Auto-renewal",
      value: filters.auto_renewal,
      onChange: (value) => handleFilterChange("auto_renewal", value),
      options: [
        { value: "", label: "All" },
        { value: "true", label: "Enabled" },
        { value: "false", label: "Disabled" },
      ],
    },
    {
      kind: "checkbox",
      key: "show_inactive",
      label: "Show inactive",
      value: filters.show_inactive === "true",
      onChange: (checked) => handleFilterChange("show_inactive", checked ? "true" : ""),
    },
  ];

  const activeFilters = countActiveFilters(filterFields);

  const getApiFilters = () => {
    const apiFilters: {
      user_id?: number;
      search?: string;
      status?: "active" | "inactive";
      auto_renewal?: boolean;
    } = {};
    if (filters.user_id && !Number.isNaN(Number(filters.user_id))) {
      apiFilters.user_id = Number(filters.user_id);
    }
    if (filters.search.trim()) {
      apiFilters.search = filters.search.trim();
    }
    // Baseline shows active only; "Show inactive" removes the status filter to include all.
    if (!filters.show_inactive) {
      apiFilters.status = "active";
    }
    if (filters.auto_renewal) {
      apiFilters.auto_renewal = filters.auto_renewal === "true";
    }
    return apiFilters;
  };

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
      <th>Name &amp; User</th>
      <th>Billing</th>
      <th>Items / Payments</th>
      <th>Expires &amp; Status</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (sub: AdminSubscriptionInfo, index: number) => (
    <tr key={sub.id || index} onClick={() => navigate(`/subscriptions/${sub.id}`)} className="cursor-pointer">
      <td className="whitespace-nowrap align-top text-white">{sub.id}</td>
      {/* Name + user */}
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
            <div className="truncate text-xs text-slate-400" title={sub.description}>
              {sub.description}
            </div>
          )}
          <Link
            to={`/users/${sub.user_id}`}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 inline-block hover:opacity-80"
            title={`User #${sub.user_id}`}
          >
            <Profile pubkey={sub.user_pubkey} avatarSize="sm" />
          </Link>
        </div>
      </td>
      {/* Billing: amount + interval / setup */}
      <td className="align-top">
        <div className="text-sm text-gray-300">
          <div className="tabular-nums">
            {formatCurrency(
              sub.line_items.reduce((sum, item) => sum + item.amount, 0),
              sub.currency,
            )}{" "}
            <span className="text-xs text-slate-400">{formatInterval(sub.interval_amount, sub.interval_type)}</span>
          </div>
          {sub.setup_fee > 0 && (
            <div className="text-xs text-slate-400">{formatCurrency(sub.setup_fee, sub.currency)} setup</div>
          )}
        </div>
      </td>
      {/* Line items + payments */}
      <td className="align-top text-gray-300">
        <div className="text-sm">{sub.line_items.length} items</div>
        <div className="mt-0.5 text-xs text-slate-400">{sub.payment_count} payments</div>
      </td>
      {/* Expires + status */}
      <td className="align-top">
        <div className="text-sm text-gray-300">
          {sub.expires ? new Date(sub.expires).toLocaleDateString() : <span className="text-slate-500">No expiry</span>}
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {sub.is_active ? (
            <StatusBadge status="active">Active</StatusBadge>
          ) : (
            <StatusBadge status="inactive">Inactive</StatusBadge>
          )}
          {sub.auto_renewal_enabled && <StatusBadge status="info">Auto-renew</StatusBadge>}
        </div>
      </td>
      <td className="text-right align-top">
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            title="Edit subscription"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(sub);
            }}
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Delete subscription"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(sub);
            }}
          >
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
      <StatsHeader
        title="Subscriptions"
        stats={[
          { label: "Total", value: stats.total },
          { label: "Active", value: stats.active, tone: "success" },
          { label: "Auto-renew", value: stats.autoRenew, tone: "accent" },
        ]}
        actions={
          <>
            <div className="w-56">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search name or description"
                className="!py-1.5 text-sm"
              />
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const id = subIdInput.trim();
                if (id && !Number.isNaN(Number(id))) {
                  navigate(`/subscriptions/${id}`);
                  setSubIdInput("");
                }
              }}
              className="flex items-center space-x-1"
            >
              <div className="w-28">
                <input
                  type="number"
                  value={subIdInput}
                  onChange={(e) => setSubIdInput(e.target.value)}
                  placeholder="Go to ID"
                  className="!py-1.5 text-sm"
                />
              </div>
              <Button variant="secondary" type="submit" disabled={!subIdInput.trim()}>
                Go
              </Button>
            </form>
            <Button onClick={() => setShowCreateModal(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Create
            </Button>
            <FilterButton open={showFilters} activeCount={activeFilters} onClick={() => setShowFilters(!showFilters)} />
          </>
        }
      />
    );
  };

  return (
    <div className="space-y-4">
      <PaginatedTable
        apiCall={(params) => adminApi.getSubscriptions({ ...params, ...getApiFilters() })}
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
        renderEmptyState={renderEmptyState}
        calculateStats={calculateStats}
        itemsPerPage={20}
        errorAction="view subscriptions"
        loadingMessage="Loading subscriptions..."
        dependencies={[refreshTrigger, filters]}
        minWidth="850px"
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

export function EditSubscriptionModal({
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
