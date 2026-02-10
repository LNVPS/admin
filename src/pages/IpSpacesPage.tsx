import {
  BanknotesIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { PaginatedTable } from "../components/PaginatedTable";
import { StatusBadge } from "../components/StatusBadge";
import { useAdminApi } from "../hooks/useAdminApi";
import { type AdminAvailableIpSpaceInfo, type AdminIpSpacePricingInfo } from "../lib/api";

export function IpSpacesPage() {
  const adminApi = useAdminApi();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [selectedIpSpace, setSelectedIpSpace] = useState<AdminAvailableIpSpaceInfo | null>(null);
  const [pricingData, setPricingData] = useState<AdminIpSpacePricingInfo[]>([]);
  const [loadingPricing, setLoadingPricing] = useState(false);

  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleEdit = (ipSpace: AdminAvailableIpSpaceInfo) => {
    setSelectedIpSpace(ipSpace);
    setShowEditModal(true);
  };

  const handleDelete = async (ipSpace: AdminAvailableIpSpaceInfo) => {
    if (!confirm(`Are you sure you want to delete IP space "${ipSpace.cidr}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await adminApi.deleteIpSpace(ipSpace.id);
      refreshData();
    } catch (error) {
      // Error handled by API layer
    }
  };

  const handleViewPricing = async (ipSpace: AdminAvailableIpSpaceInfo) => {
    setSelectedIpSpace(ipSpace);
    setShowPricingModal(true);
    setLoadingPricing(true);

    try {
      const response = await adminApi.getIpSpacePricing(ipSpace.id);
      setPricingData(response.data);
    } catch (error) {
      setPricingData([]);
    } finally {
      setLoadingPricing(false);
    }
  };

  const renderHeader = () => (
    <>
      <th className="w-16">ID</th>
      <th>CIDR</th>
      <th>Registry</th>
      <th>Prefix Range</th>
      <th>External ID</th>
      <th>Pricing</th>
      <th>Status</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (ipSpace: AdminAvailableIpSpaceInfo, index: number) => (
    <tr key={ipSpace.id || index}>
      <td className="whitespace-nowrap text-white">{ipSpace.id}</td>
      <td>
        <div className="space-y-0.5">
          <div className="font-medium text-white font-mono">{ipSpace.cidr}</div>
        </div>
      </td>
      <td>
        <div className="flex items-center">
          <GlobeAltIcon className="h-4 w-4 mr-1 text-gray-400" />
          <span className="text-gray-300">{ipSpace.registry.name}</span>
        </div>
      </td>
      <td className="text-gray-300">
        <span className="font-mono">
          /{ipSpace.min_prefix_size} - /{ipSpace.max_prefix_size}
        </span>
      </td>
      <td className="text-gray-300">
        {ipSpace.external_id ? (
          <span className="text-sm font-mono">{ipSpace.external_id}</span>
        ) : (
          <span className="text-gray-500">—</span>
        )}
      </td>
      <td>
        <button
          onClick={() => handleViewPricing(ipSpace)}
          className="inline-flex items-center text-sm text-blue-400 hover:text-blue-300"
        >
          <CurrencyDollarIcon className="h-4 w-4 mr-1" />
          {ipSpace.pricing_count} tier{ipSpace.pricing_count !== 1 ? "s" : ""}
        </button>
      </td>
      <td>
        <div className="flex gap-1">
          {ipSpace.is_reserved && <StatusBadge status="warning">Reserved</StatusBadge>}
          {ipSpace.is_available ? (
            <StatusBadge status="active">Available</StatusBadge>
          ) : (
            <StatusBadge status="inactive">Unavailable</StatusBadge>
          )}
        </div>
      </td>
      <td className="text-right">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleViewPricing(ipSpace)}>
            <CurrencyDollarIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleEdit(ipSpace)}>
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(ipSpace)}>
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );

  const renderEmptyState = () => (
    <div className="text-center py-12">
      <GlobeAltIcon className="mx-auto h-12 w-12 text-gray-600" />
      <h3 className="mt-2 text-sm font-medium text-gray-300">No IP spaces</h3>
      <p className="mt-1 text-sm text-gray-500">Get started by creating a new IP space for sale.</p>
      <div className="mt-6">
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Add IP Space
        </Button>
      </div>
    </div>
  );

  const calculateStats = (ipSpaces: AdminAvailableIpSpaceInfo[], totalItems: number) => {
    const stats = {
      total: totalItems,
      available: ipSpaces.filter((space) => space.is_available).length,
      reserved: ipSpaces.filter((space) => space.is_reserved).length,
      totalPricingTiers: ipSpaces.reduce((sum, space) => sum + space.pricing_count, 0),
    };

    return (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">IP Space for Sale</h1>
          <div className="mt-2 flex gap-4 text-sm text-gray-400">
            <span>
              Total: <span className="text-white font-medium">{stats.total}</span>
            </span>
            <span>
              Available: <span className="text-green-400 font-medium">{stats.available}</span>
            </span>
            <span>
              Reserved: <span className="text-yellow-400 font-medium">{stats.reserved}</span>
            </span>
            <span>
              Pricing Tiers: <span className="text-blue-400 font-medium">{stats.totalPricingTiers}</span>
            </span>
          </div>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add IP Space
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PaginatedTable
        apiCall={(params) => adminApi.getIpSpaces(params)}
        renderHeader={renderHeader}
        renderRow={renderRow}
        renderEmptyState={renderEmptyState}
        calculateStats={calculateStats}
        itemsPerPage={20}
        errorAction="view IP spaces"
        loadingMessage="Loading IP spaces..."
        dependencies={[refreshTrigger]}
        minWidth="1400px"
      />

      {showCreateModal && (
        <CreateIpSpaceModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            refreshData();
          }}
        />
      )}

      {showEditModal && selectedIpSpace && (
        <EditIpSpaceModal
          ipSpace={selectedIpSpace}
          onClose={() => {
            setShowEditModal(false);
            setSelectedIpSpace(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedIpSpace(null);
            refreshData();
          }}
        />
      )}

      {showPricingModal && selectedIpSpace && (
        <PricingModal
          ipSpace={selectedIpSpace}
          pricingData={pricingData}
          loading={loadingPricing}
          onClose={() => {
            setShowPricingModal(false);
            setSelectedIpSpace(null);
            setPricingData([]);
          }}
          onRefresh={() => handleViewPricing(selectedIpSpace)}
        />
      )}
    </div>
  );
}

function CreateIpSpaceModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const adminApi = useAdminApi();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    cidr: "",
    min_prefix_size: 24,
    max_prefix_size: 22,
    registry: 1, // RIPE by default
    external_id: "",
    is_available: true,
    is_reserved: false,
    metadata: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      let metadata = null;
      if (formData.metadata.trim()) {
        try {
          metadata = JSON.parse(formData.metadata);
        } catch {
          setError("Invalid JSON metadata");
          setSubmitting(false);
          return;
        }
      }

      await adminApi.createIpSpace({
        cidr: formData.cidr,
        min_prefix_size: formData.min_prefix_size,
        max_prefix_size: formData.max_prefix_size,
        registry: formData.registry,
        external_id: formData.external_id || null,
        is_available: formData.is_available,
        is_reserved: formData.is_reserved,
        metadata,
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create IP space");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Create IP Space" icon={GlobeAltIcon}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">CIDR</label>
          <input
            type="text"
            value={formData.cidr}
            onChange={(e) => setFormData({ ...formData, cidr: e.target.value })}
            placeholder="e.g., 192.168.0.0/22"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500"
            required
          />
          <p className="text-xs text-gray-400 mt-1">IPv4 or IPv6 CIDR notation</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Min Prefix Size</label>
            <input
              type="number"
              value={formData.min_prefix_size}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  min_prefix_size: parseInt(e.target.value),
                })
              }
              min="1"
              max="128"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            />
            <p className="text-xs text-gray-400 mt-1">Smallest allocation</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Max Prefix Size</label>
            <input
              type="number"
              value={formData.max_prefix_size}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  max_prefix_size: parseInt(e.target.value),
                })
              }
              min="1"
              max="128"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            />
            <p className="text-xs text-gray-400 mt-1">Largest allocation</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Registry</label>
          <select
            value={formData.registry}
            onChange={(e) => setFormData({ ...formData, registry: parseInt(e.target.value) })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            required
          >
            <option value={0}>ARIN (North America)</option>
            <option value={1}>RIPE (Europe)</option>
            <option value={2}>APNIC (Asia Pacific)</option>
            <option value={3}>LACNIC (Latin America)</option>
            <option value={4}>AFRINIC (Africa)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">External ID (Optional)</label>
          <input
            type="text"
            value={formData.external_id}
            onChange={(e) => setFormData({ ...formData, external_id: e.target.value })}
            placeholder="e.g., NET-192-168-0-0-1"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500"
          />
          <p className="text-xs text-gray-400 mt-1">RIR allocation ID</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Metadata (Optional JSON)</label>
          <textarea
            value={formData.metadata}
            onChange={(e) => setFormData({ ...formData, metadata: e.target.value })}
            placeholder='{"routing_requirements": "BGP", "upstream_provider": "Cogent"}'
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 font-mono text-sm"
            rows={3}
          />
        </div>

        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_available}
              onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm text-gray-300">Available for sale</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_reserved}
              onChange={(e) => setFormData({ ...formData, is_reserved: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm text-gray-300">Reserved</span>
          </label>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-900 rounded-lg p-3 text-red-300 text-sm">{error}</div>
        )}

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting ? "Creating..." : "Create IP Space"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditIpSpaceModal({
  ipSpace,
  onClose,
  onSuccess,
}: {
  ipSpace: AdminAvailableIpSpaceInfo;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    cidr: ipSpace.cidr,
    min_prefix_size: ipSpace.min_prefix_size,
    max_prefix_size: ipSpace.max_prefix_size,
    registry: ipSpace.registry.value,
    external_id: ipSpace.external_id || "",
    is_available: ipSpace.is_available,
    is_reserved: ipSpace.is_reserved,
    metadata: ipSpace.metadata ? JSON.stringify(ipSpace.metadata, null, 2) : "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      let metadata = null;
      if (formData.metadata.trim()) {
        try {
          metadata = JSON.parse(formData.metadata);
        } catch {
          setError("Invalid JSON metadata");
          setSubmitting(false);
          return;
        }
      }

      await adminApi.updateIpSpace(ipSpace.id, {
        cidr: formData.cidr,
        min_prefix_size: formData.min_prefix_size,
        max_prefix_size: formData.max_prefix_size,
        registry: formData.registry,
        external_id: formData.external_id || null,
        is_available: formData.is_available,
        is_reserved: formData.is_reserved,
        metadata,
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update IP space");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit IP Space" icon={PencilIcon}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">CIDR</label>
          <input
            type="text"
            value={formData.cidr}
            onChange={(e) => setFormData({ ...formData, cidr: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Min Prefix Size</label>
            <input
              type="number"
              value={formData.min_prefix_size}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  min_prefix_size: parseInt(e.target.value),
                })
              }
              min="1"
              max="128"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Max Prefix Size</label>
            <input
              type="number"
              value={formData.max_prefix_size}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  max_prefix_size: parseInt(e.target.value),
                })
              }
              min="1"
              max="128"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Registry</label>
          <select
            value={formData.registry}
            onChange={(e) => setFormData({ ...formData, registry: parseInt(e.target.value) })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            required
          >
            <option value={0}>ARIN (North America)</option>
            <option value={1}>RIPE (Europe)</option>
            <option value={2}>APNIC (Asia Pacific)</option>
            <option value={3}>LACNIC (Latin America)</option>
            <option value={4}>AFRINIC (Africa)</option>
          </select>
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

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Metadata (JSON)</label>
          <textarea
            value={formData.metadata}
            onChange={(e) => setFormData({ ...formData, metadata: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm"
            rows={3}
          />
        </div>

        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_available}
              onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm text-gray-300">Available for sale</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_reserved}
              onChange={(e) => setFormData({ ...formData, is_reserved: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm text-gray-300">Reserved</span>
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

function PricingModal({
  ipSpace,
  pricingData,
  loading,
  onClose,
  onRefresh,
}: {
  ipSpace: AdminAvailableIpSpaceInfo;
  pricingData: AdminIpSpacePricingInfo[];
  loading: boolean;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const adminApi = useAdminApi();
  const [showAddPricing, setShowAddPricing] = useState(false);
  const [editingPricing, setEditingPricing] = useState<AdminIpSpacePricingInfo | null>(null);

  const handleDeletePricing = async (pricing: AdminIpSpacePricingInfo) => {
    if (!confirm(`Delete pricing for /${pricing.prefix_size}?`)) return;

    try {
      await adminApi.deleteIpSpacePricing(ipSpace.id, pricing.id);
      onRefresh();
    } catch (error) {
      // Error handled by API layer
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Pricing for ${ipSpace.cidr}`} icon={BanknotesIcon} size="xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-gray-400 text-sm">Configure pricing tiers for different subnet sizes</p>
          <Button size="sm" onClick={() => setShowAddPricing(true)}>
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Pricing
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading pricing data...</div>
        ) : pricingData.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No pricing configured yet</div>
        ) : (
          <div className="space-y-2">
            {pricingData.map((pricing) => (
              <div key={pricing.id} className="bg-gray-700 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">/{pricing.prefix_size} Subnet</div>
                  <div className="text-sm text-gray-400">
                    {pricing.price_per_month / 100} {pricing.currency}/month
                    {pricing.setup_fee > 0 && ` + ${pricing.setup_fee / 100} ${pricing.currency} setup`}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingPricing(pricing)}>
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeletePricing(pricing)}>
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showAddPricing && (
          <AddPricingForm
            ipSpace={ipSpace}
            onClose={() => setShowAddPricing(false)}
            onSuccess={() => {
              setShowAddPricing(false);
              onRefresh();
            }}
          />
        )}

        {editingPricing && (
          <EditPricingForm
            ipSpace={ipSpace}
            pricing={editingPricing}
            onClose={() => setEditingPricing(null)}
            onSuccess={() => {
              setEditingPricing(null);
              onRefresh();
            }}
          />
        )}
      </div>
    </Modal>
  );
}

function AddPricingForm({
  ipSpace,
  onClose,
  onSuccess,
}: {
  ipSpace: AdminAvailableIpSpaceInfo;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    prefix_size: ipSpace.min_prefix_size,
    price_per_month: 0,
    currency: "USD",
    setup_fee: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await adminApi.createIpSpacePricing(ipSpace.id, {
        prefix_size: formData.prefix_size,
        price_per_month: Math.round(formData.price_per_month * 100), // Convert to cents
        currency: formData.currency,
        setup_fee: Math.round(formData.setup_fee * 100), // Convert to cents
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add pricing");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border-t border-gray-600 pt-4 mt-4">
      <h4 className="font-medium text-white mb-3">Add Pricing Tier</h4>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Prefix Size</label>
            <input
              type="number"
              value={formData.prefix_size}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  prefix_size: parseInt(e.target.value),
                })
              }
              min={ipSpace.max_prefix_size}
              max={ipSpace.min_prefix_size}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            />
          </div>

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
              <option value="BTC">BTC</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Price/Month</label>
            <input
              type="number"
              step="0.01"
              value={formData.price_per_month}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  price_per_month: parseFloat(e.target.value),
                })
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Setup Fee</label>
            <input
              type="number"
              step="0.01"
              value={formData.setup_fee}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  setup_fee: parseFloat(e.target.value),
                })
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-900 rounded-lg p-3 text-red-300 text-sm">{error}</div>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting} size="sm">
            {submitting ? "Adding..." : "Add"}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

function EditPricingForm({
  ipSpace,
  pricing,
  onClose,
  onSuccess,
}: {
  ipSpace: AdminAvailableIpSpaceInfo;
  pricing: AdminIpSpacePricingInfo;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    prefix_size: pricing.prefix_size,
    price_per_month: pricing.price_per_month / 100, // Convert from cents
    currency: pricing.currency,
    setup_fee: pricing.setup_fee / 100, // Convert from cents
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await adminApi.updateIpSpacePricing(ipSpace.id, pricing.id, {
        prefix_size: formData.prefix_size,
        price_per_month: Math.round(formData.price_per_month * 100),
        currency: formData.currency,
        setup_fee: Math.round(formData.setup_fee * 100),
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update pricing");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border-t border-gray-600 pt-4 mt-4">
      <h4 className="font-medium text-white mb-3">Edit Pricing Tier</h4>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Prefix Size</label>
            <input
              type="number"
              value={formData.prefix_size}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  prefix_size: parseInt(e.target.value),
                })
              }
              min={ipSpace.max_prefix_size}
              max={ipSpace.min_prefix_size}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            />
          </div>

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
              <option value="BTC">BTC</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Price/Month</label>
            <input
              type="number"
              step="0.01"
              value={formData.price_per_month}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  price_per_month: parseFloat(e.target.value),
                })
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Setup Fee</label>
            <input
              type="number"
              step="0.01"
              value={formData.setup_fee}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  setup_fee: parseFloat(e.target.value),
                })
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-900 rounded-lg p-3 text-red-300 text-sm">{error}</div>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting} size="sm">
            {submitting ? "Saving..." : "Save"}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
