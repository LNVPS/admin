import { BanknotesIcon, PencilIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { PaginatedTable } from "../components/PaginatedTable";
import { useAdminApi } from "../hooks/useAdminApi";
import { useApiCall } from "../hooks/useApiCall";
import { useToast } from "../hooks/useToast";
import type {
  AdminResourceCostDetail,
  CreateResourceCostRequest,
  ResourceCostIntervalType,
  ResourceCostResourceType,
  ResourceCostType,
} from "../lib/api";
import { CURRENCIES, formatCurrency, fromSmallestUnits, toSmallestUnits } from "../utils/currency";

const RESOURCE_TYPE_LABELS: Record<ResourceCostResourceType, string> = {
  vm_host: "Host",
  ip_range: "IP Range",
  generic: "Generic",
};

function formatInterval(cost: AdminResourceCostDetail): string {
  if (cost.cost_type === "one_time") return "One-time";
  if (!cost.interval_amount || !cost.interval_type) return "Recurring";
  const unit = cost.interval_amount === 1 ? cost.interval_type : `${cost.interval_type}s`;
  return `Every ${cost.interval_amount === 1 ? "" : `${cost.interval_amount} `}${unit}`;
}

function toDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

function toApiDate(value: string): string | null {
  return value ? `${value}T00:00:00Z` : null;
}

export function ResourceCostsPage() {
  const adminApi = useAdminApi();
  const { success, error: showError } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCost, setEditingCost] = useState<AdminResourceCostDetail | null>(null);
  const [typeFilter, setTypeFilter] = useState<ResourceCostResourceType | "">("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Resource name lookups for display
  const { data: hosts } = useApiCall(async () => (await adminApi.getHosts({ limit: 100 })).data, []);
  const { data: ipRanges } = useApiCall(async () => (await adminApi.getIpRanges({ limit: 100 })).data, []);

  const resourceName = (cost: AdminResourceCostDetail): string => {
    if (cost.resource_type === "generic") return cost.label ?? "Generic";
    if (cost.resource_type === "vm_host") {
      const host = hosts?.find((h) => h.id === cost.resource_id);
      return host ? host.name : `Host #${cost.resource_id}`;
    }
    const range = ipRanges?.find((r) => r.id === cost.resource_id);
    return range ? range.cidr : `IP Range #${cost.resource_id}`;
  };

  const refreshData = () => setRefreshTrigger((prev) => prev + 1);

  const handleDelete = async (cost: AdminResourceCostDetail) => {
    if (
      !confirm(
        `Delete this ${RESOURCE_TYPE_LABELS[cost.resource_type]} cost of ${formatCurrency(cost.amount, cost.currency)}?`,
      )
    ) {
      return;
    }
    try {
      await adminApi.deleteResourceCost(cost.id);
      success("Resource cost deleted");
      refreshData();
    } catch (error) {
      console.error("Failed to delete resource cost:", error);
      showError("Failed to delete resource cost", error instanceof Error ? error.message : undefined);
    }
  };

  const renderHeader = () => (
    <>
      <th className="w-16">ID</th>
      <th>Resource</th>
      <th>Cost</th>
      <th>Schedule</th>
      <th>Billing Period</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (cost: AdminResourceCostDetail, index: number) => (
    <tr key={cost.id || index}>
      <td className="whitespace-nowrap align-top text-white">{cost.id}</td>
      <td className="align-top">
        <div className="font-medium text-white">{resourceName(cost)}</div>
        <div className="mt-0.5 text-xs text-slate-400">
          {RESOURCE_TYPE_LABELS[cost.resource_type]}
          {cost.resource_type !== "generic" && cost.label ? ` · ${cost.label}` : ""}
        </div>
      </td>
      <td className="align-top">
        <div className="font-medium text-green-400">{formatCurrency(cost.amount, cost.currency)}</div>
        {cost.resource_type === "ip_range" && cost.cost_type === "recurring" && (
          <div className="text-xs text-slate-400">per block</div>
        )}
      </td>
      <td className="align-top text-gray-300">
        <div>{formatInterval(cost)}</div>
        <div className="mt-0.5 text-xs text-slate-400">{cost.cost_type === "one_time" ? "Capital" : "Operating"}</div>
      </td>
      <td className="align-top text-gray-300 text-sm">
        <div>{cost.billing_start ? new Date(cost.billing_start).toLocaleDateString() : "—"}</div>
        <div className="mt-0.5 text-xs text-slate-400">
          {cost.billing_end
            ? `until ${new Date(cost.billing_end).toLocaleDateString()}`
            : cost.cost_type === "recurring"
              ? "ongoing"
              : ""}
        </div>
      </td>
      <td className="text-right align-top">
        <div className="flex justify-end space-x-2">
          <Button size="sm" variant="secondary" onClick={() => setEditingCost(cost)} className="p-1">
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleDelete(cost)}
            className="text-red-400 hover:text-red-300 p-1"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );

  const renderEmptyState = () => (
    <div className="text-center py-8 text-slate-400">
      <BanknotesIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>No resource costs tracked yet</p>
    </div>
  );

  const calculateStats = (costs: AdminResourceCostDetail[], totalItems: number) => {
    const recurring = costs.filter((c) => c.cost_type === "recurring").length;
    const oneTime = costs.filter((c) => c.cost_type === "one_time").length;
    return (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Resource Costs</h1>
          <div className="mt-2 flex gap-4 text-sm text-gray-400">
            <span>
              Total: <span className="text-white font-medium">{totalItems}</span>
            </span>
            <span>
              Recurring: <span className="text-blue-400 font-medium">{recurring}</span>
            </span>
            <span>
              One-time: <span className="text-yellow-400 font-medium">{oneTime}</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ResourceCostResourceType | "")}
            className="!w-auto"
          >
            <option value="">All resource types</option>
            <option value="vm_host">Hosts</option>
            <option value="ip_range">IP Ranges</option>
            <option value="generic">Generic</option>
          </select>
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Cost
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PaginatedTable
        apiCall={(params) =>
          adminApi.getResourceCosts({ ...params, ...(typeFilter ? { resource_type: typeFilter } : {}) })
        }
        renderHeader={renderHeader}
        renderRow={renderRow}
        renderEmptyState={renderEmptyState}
        calculateStats={calculateStats}
        itemsPerPage={20}
        errorAction="view resource costs"
        loadingMessage="Loading resource costs..."
        dependencies={[refreshTrigger, typeFilter]}
        minWidth="900px"
      />

      {(showCreateModal || editingCost) && (
        <ResourceCostModal
          cost={editingCost}
          onClose={() => {
            setShowCreateModal(false);
            setEditingCost(null);
          }}
          onSuccess={refreshData}
        />
      )}
    </div>
  );
}

interface ResourceCostFormState {
  resource_type: ResourceCostResourceType;
  resource_id: string;
  label: string;
  cost_type: ResourceCostType;
  amount: string;
  currency: string;
  interval_amount: string;
  interval_type: ResourceCostIntervalType;
  billing_start: string;
  billing_end: string;
}

function ResourceCostModal({
  cost,
  onClose,
  onSuccess,
}: {
  cost: AdminResourceCostDetail | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ResourceCostFormState>(() => ({
    resource_type: cost?.resource_type ?? "vm_host",
    resource_id: cost ? String(cost.resource_id) : "",
    label: cost?.label ?? "",
    cost_type: cost?.cost_type ?? "recurring",
    amount: cost ? String(fromSmallestUnits(cost.amount, cost.currency)) : "",
    currency: cost?.currency ?? "EUR",
    interval_amount: cost?.interval_amount ? String(cost.interval_amount) : "1",
    interval_type: cost?.interval_type ?? "month",
    billing_start: toDateInput(cost?.billing_start ?? null),
    billing_end: toDateInput(cost?.billing_end ?? null),
  }));

  const { data: hosts } = useApiCall(async () => (await adminApi.getHosts({ limit: 100 })).data, []);
  const { data: ipRanges } = useApiCall(async () => (await adminApi.getIpRanges({ limit: 100 })).data, []);

  // Default the resource selection when the type changes on create
  useEffect(() => {
    if (cost) return;
    if (formData.resource_type === "vm_host" && hosts?.length && !formData.resource_id) {
      setFormData((f) => ({ ...f, resource_id: String(hosts[0].id) }));
    }
    if (formData.resource_type === "ip_range" && ipRanges?.length && !formData.resource_id) {
      setFormData((f) => ({ ...f, resource_id: String(ipRanges[0].id) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.resource_type, hosts, ipRanges]);

  const isRecurring = formData.cost_type === "recurring";
  const isGeneric = formData.resource_type === "generic";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number.parseFloat(formData.amount);
    if (Number.isNaN(amount) || amount < 0) {
      showError("Invalid amount");
      return;
    }
    setLoading(true);
    try {
      const payload: CreateResourceCostRequest = {
        resource_type: formData.resource_type,
        resource_id: isGeneric ? 0 : Number.parseInt(formData.resource_id, 10),
        label: formData.label || null,
        cost_type: formData.cost_type,
        amount: toSmallestUnits(amount, formData.currency),
        currency: formData.currency,
        interval_amount: isRecurring ? Number.parseInt(formData.interval_amount, 10) : null,
        interval_type: isRecurring ? formData.interval_type : null,
        billing_start: toApiDate(formData.billing_start),
        billing_end: toApiDate(formData.billing_end),
      };
      if (cost) {
        const { resource_type: _resourceType, ...updates } = payload;
        await adminApi.updateResourceCost(cost.id, updates);
        success("Resource cost updated");
      } else {
        await adminApi.createResourceCost(payload);
        success("Resource cost created");
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to save resource cost:", error);
      showError("Failed to save resource cost", error instanceof Error ? error.message : undefined);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={cost ? "Edit Resource Cost" : "Add Resource Cost"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">Resource Type *</label>
            <select
              value={formData.resource_type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  resource_type: e.target.value as ResourceCostResourceType,
                  resource_id: "",
                })
              }
              disabled={!!cost}
              required
            >
              <option value="vm_host">Host</option>
              <option value="ip_range">IP Range</option>
              <option value="generic">Generic (unlinked)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Cost Type *</label>
            <select
              value={formData.cost_type}
              onChange={(e) => setFormData({ ...formData, cost_type: e.target.value as ResourceCostType })}
              required
            >
              <option value="recurring">Recurring</option>
              <option value="one_time">One-time (capital)</option>
            </select>
          </div>
        </div>

        {!isGeneric && (
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              {formData.resource_type === "vm_host" ? "Host *" : "IP Range *"}
            </label>
            <select
              value={formData.resource_id}
              onChange={(e) => setFormData({ ...formData, resource_id: e.target.value })}
              disabled={!!cost}
              required
            >
              <option value="" disabled>
                Select...
              </option>
              {formData.resource_type === "vm_host"
                ? hosts?.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.region.name})
                    </option>
                  ))
                : ipRanges?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.cidr} {r.region_name ? `(${r.region_name})` : ""}
                    </option>
                  ))}
            </select>
            {formData.resource_type === "ip_range" && isRecurring && (
              <p className="mt-1 text-xs text-slate-400">For IP ranges, the amount is the cost for the entire block.</p>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-white mb-2">Label {isGeneric ? "*" : "(optional)"}</label>
          <input
            type="text"
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            placeholder={isGeneric ? "e.g. Upstream transit (Cogent)" : "e.g. Colo rent"}
            required={isGeneric}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Amount * {formData.currency === "BTC" ? "(sats)" : ""}
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Currency *</label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              required
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isRecurring && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-white mb-2">Interval Amount *</label>
              <input
                type="number"
                min="1"
                value={formData.interval_amount}
                onChange={(e) => setFormData({ ...formData, interval_amount: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white mb-2">Interval Type *</label>
              <select
                value={formData.interval_type}
                onChange={(e) =>
                  setFormData({ ...formData, interval_type: e.target.value as ResourceCostIntervalType })
                }
                required
              >
                <option value="day">Day</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              {formData.cost_type === "one_time" ? "Purchase Date" : "Billing Start"}
            </label>
            <input
              type="date"
              value={formData.billing_start}
              onChange={(e) => setFormData({ ...formData, billing_start: e.target.value })}
            />
          </div>
          {isRecurring && (
            <div>
              <label className="block text-xs font-medium text-white mb-2">Billing End (optional)</label>
              <input
                type="date"
                value={formData.billing_end}
                onChange={(e) => setFormData({ ...formData, billing_end: e.target.value })}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : cost ? "Save Changes" : "Create Cost"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
