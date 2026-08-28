import {
  GlobeAltIcon,
  LinkIcon,
  PencilIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { PaginatedTable } from "../components/PaginatedTable";
import { StatsHeader } from "../components/StatsHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useAdminApi } from "../hooks/useAdminApi";
import { useCachedCompanies } from "../hooks/useCachedCompanies";
import type { AdminTunnelPoolInfo, AdminVpnServiceInfo } from "../lib/api";
import { confirmDialog } from "../services/confirmService";
import { toastService } from "../services/toastService";
import { CURRENCIES, formatCurrency, fromSmallestUnits, toSmallestUnits } from "../utils/currency";

const INTERVAL_TYPES = ["day", "month", "year"] as const;
type IntervalType = (typeof INTERVAL_TYPES)[number];

const DEFAULT_DEVICE_LIMIT = 5;

function formatPrice(service: AdminVpnServiceInfo): string {
  const period =
    service.interval_amount === 1 ? service.interval_type : `${service.interval_amount} ${service.interval_type}s`;
  return `${formatCurrency(service.amount, service.currency)} / ${period}`;
}

export function VpnServicesPage() {
  const adminApi = useAdminApi();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editing, setEditing] = useState<AdminVpnServiceInfo | null>(null);
  const [managingRegions, setManagingRegions] = useState<AdminVpnServiceInfo | null>(null);

  const refreshData = () => setRefreshTrigger((prev) => prev + 1);

  const handleDelete = async (service: AdminVpnServiceInfo) => {
    if (
      !(await confirmDialog({
        title: "Delete VPN Service",
        message: `Delete "${service.name}"? Its interfaces are unlinked and re-pushed, so they stop serving devices. To take a service off sale without touching paid plans, disable it instead.`,
      }))
    ) {
      return;
    }
    try {
      await adminApi.deleteVpnService(service.id);
      toastService.success("VPN service deleted");
      refreshData();
    } catch (err) {
      toastService.error("Failed to delete VPN service", err instanceof Error ? err.message : undefined);
    }
  };

  const renderHeader = () => (
    <>
      <th className="w-16">ID</th>
      <th>Service</th>
      <th>Price</th>
      <th>Devices</th>
      <th>Regions</th>
      <th>Plans</th>
      <th>DNS</th>
      <th>Status</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (service: AdminVpnServiceInfo, index: number) => (
    <tr key={service.id || index}>
      <td className="whitespace-nowrap align-top text-white">{service.id}</td>
      <td className="align-top">
        <div className="min-w-0 max-w-[14rem]">
          <div className="truncate font-medium text-white" title={service.name}>
            {service.name}
          </div>
          <div className="text-[11px] text-gray-500">Company #{service.company_id}</div>
        </div>
      </td>
      <td className="align-top text-gray-300">
        <div className="tabular-nums">{formatPrice(service)}</div>
        {service.setup_amount > 0 && (
          <div className="text-[11px] text-gray-500">
            + {formatCurrency(service.setup_amount, service.currency)} setup
          </div>
        )}
      </td>
      <td className="align-top text-gray-300 tabular-nums">{service.default_device_limit}</td>
      <td className="align-top">
        {service.regions.length === 0 ? (
          <span className="text-[11px] text-amber-400">None linked</span>
        ) : (
          <div className="flex flex-wrap gap-1 max-w-[16rem]">
            {service.regions.map((region) => (
              <span
                key={region.tunnel_pool_id}
                className={`rounded px-1.5 py-0.5 text-[11px] ${
                  region.enabled ? "bg-slate-700 text-gray-200" : "bg-slate-800 text-gray-500 line-through"
                }`}
                title={`${region.endpoint} · ${region.public_key.slice(0, 16)}…`}
              >
                {region.region_name}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="align-top text-gray-300 tabular-nums">
        {service.subscriptions > 0 ? (
          <Link to={`/vpn-subscriptions?vpn_service_id=${service.id}`} className="text-blue-400 hover:underline">
            {service.subscriptions}
          </Link>
        ) : (
          0
        )}
      </td>
      <td className="align-top font-mono text-xs text-gray-400 max-w-[10rem] truncate" title={service.dns ?? ""}>
        {service.dns ?? "—"}
      </td>
      <td className="align-top">
        {service.enabled ? (
          <StatusBadge status="active">On sale</StatusBadge>
        ) : (
          <StatusBadge status="inactive">Off sale</StatusBadge>
        )}
      </td>
      <td className="text-right align-top">
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" title="Manage regions" onClick={() => setManagingRegions(service)}>
            <LinkIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" title="Edit" onClick={() => setEditing(service)}>
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300"
            title={service.subscriptions > 0 ? "Refused while the service has subscribers" : "Delete"}
            onClick={() => handleDelete(service)}
            disabled={service.subscriptions > 0}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );

  const renderEmptyState = () => (
    <div className="text-center py-12">
      <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-600" />
      <h3 className="mt-2 text-sm font-medium text-gray-300">No VPN services</h3>
      <p className="mt-1 text-sm text-gray-500">
        A VPN service is one price, one device allowance, and the regions it is sold in.
      </p>
      <div className="mt-6">
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Add VPN Service
        </Button>
      </div>
    </div>
  );

  const calculateStats = (services: AdminVpnServiceInfo[], totalItems: number) => {
    const onSale = services.filter((s) => s.enabled).length;
    const plans = services.reduce((sum, s) => sum + s.subscriptions, 0);
    const unlinked = services.filter((s) => s.regions.length === 0).length;

    return (
      <StatsHeader
        title="VPN Services"
        subtitle="The product a customer subscribes to. A device holds one key and one address valid in every region linked here, so picking a region is only a choice of endpoint."
        stats={[
          { label: "Total", value: totalItems },
          { label: "On sale", value: onSale, tone: "success" },
          { label: "No regions", value: unlinked, tone: unlinked > 0 ? "warning" : undefined },
          { label: "Plans sold", value: plans, tone: "accent" },
        ]}
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add VPN Service
          </Button>
        }
      />
    );
  };

  return (
    <div className="space-y-6">
      <PaginatedTable
        apiCall={(params) => adminApi.getVpnServices(params)}
        renderHeader={renderHeader}
        renderRow={renderRow}
        renderEmptyState={renderEmptyState}
        calculateStats={calculateStats}
        itemsPerPage={20}
        errorAction="view VPN services"
        loadingMessage="Loading VPN services..."
        dependencies={[refreshTrigger]}
        minWidth="1200px"
      />

      {showCreateModal && (
        <CreateVpnServiceModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            refreshData();
          }}
        />
      )}

      {editing && (
        <EditVpnServiceModal
          service={editing}
          onClose={() => setEditing(null)}
          onSuccess={() => {
            setEditing(null);
            refreshData();
          }}
        />
      )}

      {managingRegions && (
        <ManageRegionsModal
          service={managingRegions}
          onClose={() => {
            setManagingRegions(null);
            refreshData();
          }}
        />
      )}
    </div>
  );
}

function CreateVpnServiceModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const adminApi = useAdminApi();
  const { data: companies } = useCachedCompanies();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    company_id: 0,
    name: "",
    currency: "EUR",
    amount: "",
    interval_amount: "1",
    interval_type: "month" as IntervalType,
    setup_amount: "",
    dns: "",
    default_device_limit: String(DEFAULT_DEVICE_LIMIT),
    enabled: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await adminApi.createVpnService({
        company_id: formData.company_id,
        name: formData.name,
        currency: formData.currency,
        amount: toSmallestUnits(Number(formData.amount), formData.currency),
        interval_amount: formData.interval_amount ? Number(formData.interval_amount) : undefined,
        interval_type: formData.interval_type,
        setup_amount: formData.setup_amount
          ? toSmallestUnits(Number(formData.setup_amount), formData.currency)
          : undefined,
        dns: formData.dns.trim() || undefined,
        default_device_limit: formData.default_device_limit ? Number(formData.default_device_limit) : undefined,
        enabled: formData.enabled,
      });
      toastService.success("VPN service created", "Link at least one interface before putting it on sale.");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create VPN service");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Create VPN Service" size="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Company *</label>
            <select
              value={formData.company_id || ""}
              onChange={(e) => setFormData({ ...formData, company_id: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            >
              <option value="">Select a company…</option>
              {companies?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Who bills for it. Cannot be changed later.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              placeholder="e.g. LNVPS VPN"
              required
            />
          </div>
        </div>

        <PriceFields
          currency={formData.currency}
          amount={formData.amount}
          intervalAmount={formData.interval_amount}
          intervalType={formData.interval_type}
          setupAmount={formData.setup_amount}
          onChange={(patch) => setFormData({ ...formData, ...patch })}
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Device limit</label>
            <input
              type="number"
              min={1}
              value={formData.default_device_limit}
              onChange={(e) => setFormData({ ...formData, default_device_limit: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
            <p className="text-xs text-gray-400 mt-1">Devices a plan may register. Defaults to 5.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">DNS servers</label>
            <input
              type="text"
              value={formData.dns}
              onChange={(e) => setFormData({ ...formData, dns: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono"
              placeholder="1.1.1.1, 1.0.0.1"
            />
            <p className="text-xs text-gray-400 mt-1">Handed to clients in the config they download.</p>
          </div>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
          />
          <span className="text-sm text-gray-300">On sale</span>
        </label>
        <p className="-mt-3 text-xs text-gray-400">
          Leave off until an interface is linked: a service with no regions has nothing to connect to.
        </p>

        {error && (
          <div className="bg-red-900/20 border border-red-900 rounded-lg p-3 text-red-300 text-sm">{error}</div>
        )}

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting ? "Creating…" : "Create VPN Service"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditVpnServiceModal({
  service,
  onClose,
  onSuccess,
}: {
  service: AdminVpnServiceInfo;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: service.name,
    currency: service.currency,
    amount: String(fromSmallestUnits(service.amount, service.currency)),
    interval_amount: String(service.interval_amount),
    interval_type: service.interval_type as IntervalType,
    setup_amount: String(fromSmallestUnits(service.setup_amount, service.currency)),
    dns: service.dns ?? "",
    default_device_limit: String(service.default_device_limit),
    enabled: service.enabled,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await adminApi.updateVpnService(service.id, {
        name: formData.name,
        currency: formData.currency,
        amount: toSmallestUnits(Number(formData.amount), formData.currency),
        interval_amount: Number(formData.interval_amount),
        interval_type: formData.interval_type,
        setup_amount: toSmallestUnits(Number(formData.setup_amount || 0), formData.currency),
        dns: formData.dns.trim() || null,
        default_device_limit: Number(formData.default_device_limit),
        enabled: formData.enabled,
      });
      toastService.success("VPN service updated");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update VPN service");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Edit VPN service: ${service.name}`} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            required
          />
        </div>

        <PriceFields
          currency={formData.currency}
          amount={formData.amount}
          intervalAmount={formData.interval_amount}
          intervalType={formData.interval_type}
          setupAmount={formData.setup_amount}
          onChange={(patch) => setFormData({ ...formData, ...patch })}
        />
        <p className="-mt-2 text-xs text-gray-400">
          A price change applies to everyone who has already bought this service on their next renewal.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Device limit</label>
            <input
              type="number"
              min={1}
              value={formData.default_device_limit}
              onChange={(e) => setFormData({ ...formData, default_device_limit: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
            <p className="text-xs text-gray-400 mt-1">
              Lowering it disconnects nobody already over the limit; it stops them adding more.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">DNS servers</label>
            <input
              type="text"
              value={formData.dns}
              onChange={(e) => setFormData({ ...formData, dns: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono"
              placeholder="Blank clears"
            />
            <p className="text-xs text-gray-400 mt-1">Clients pick this up on their next config download.</p>
          </div>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
          />
          <span className="text-sm text-gray-300">On sale</span>
        </label>
        <p className="-mt-3 text-xs text-gray-400">
          Turning this off retires the service: no new plans, and plans already paid for keep working.
        </p>

        {error && (
          <div className="bg-red-900/20 border border-red-900 rounded-lg p-3 text-red-300 text-sm">{error}</div>
        )}

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting ? "Saving…" : "Save changes"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface PriceFieldsProps {
  currency: string;
  amount: string;
  intervalAmount: string;
  intervalType: IntervalType;
  setupAmount: string;
  onChange: (
    patch: Partial<{
      currency: string;
      amount: string;
      interval_amount: string;
      interval_type: IntervalType;
      setup_amount: string;
    }>,
  ) => void;
}

/** The price block, identical in create and edit. */
function PriceFields({ currency, amount, intervalAmount, intervalType, setupAmount, onChange }: PriceFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Currency *</label>
        <select
          value={currency}
          onChange={(e) => onChange({ currency: e.target.value })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          required
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Price *</label>
        <input
          type="number"
          step="any"
          min={0}
          value={amount}
          onChange={(e) => onChange({ amount: e.target.value })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          required
        />
        <p className="text-xs text-gray-400 mt-1">{currency === "BTC" ? "sats" : "major units"}</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Every</label>
        <input
          type="number"
          min={1}
          value={intervalAmount}
          onChange={(e) => onChange({ interval_amount: e.target.value })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Interval</label>
        <select
          value={intervalType}
          onChange={(e) => onChange({ interval_type: e.target.value as IntervalType })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
        >
          {INTERVAL_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Setup fee</label>
        <input
          type="number"
          step="any"
          min={0}
          value={setupAmount}
          onChange={(e) => onChange({ setup_amount: e.target.value })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          placeholder="0"
        />
        <p className="text-xs text-gray-400 mt-1">One-off, first payment.</p>
      </div>
    </div>
  );
}

/**
 * Link and unlink the interfaces that terminate a service.
 *
 * Linking makes a pool's region available to every device on the service, so
 * this is an operation on the service rather than an edit to the pool.
 */
function ManageRegionsModal({ service, onClose }: { service: AdminVpnServiceInfo; onClose: () => void }) {
  const adminApi = useAdminApi();
  const [current, setCurrent] = useState(service);
  const [pools, setPools] = useState<AdminTunnelPoolInfo[]>([]);
  const [loadingPools, setLoadingPools] = useState(true);
  const [busyPoolId, setBusyPoolId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .getTunnelPools({ limit: 100 })
      .then((response) => {
        if (!cancelled) setPools(response.data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load tunnel pools");
      })
      .finally(() => {
        if (!cancelled) setLoadingPools(false);
      });
    return () => {
      cancelled = true;
    };
  }, [adminApi]);

  const linkedPoolIds = new Set(current.regions.map((r) => r.tunnel_pool_id));
  const available = pools.filter((p) => !linkedPoolIds.has(p.id));

  const handleLink = async (pool: AdminTunnelPoolInfo) => {
    setBusyPoolId(pool.id);
    setError(null);
    try {
      setCurrent(await adminApi.linkVpnServicePool(current.id, pool.id));
      toastService.success("Region linked", `${pool.region_name} is being configured with the service's devices.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link the interface");
    } finally {
      setBusyPoolId(null);
    }
  };

  const handleUnlink = async (tunnelPoolId: number, regionName: string) => {
    if (
      !(await confirmDialog({
        title: "Withdraw region",
        message: `Stop ${regionName} terminating "${current.name}"? Devices keep their addresses and every other region, but this endpoint stops working for them.`,
        confirmText: "Unlink",
      }))
    ) {
      return;
    }
    setBusyPoolId(tunnelPoolId);
    setError(null);
    try {
      setCurrent(await adminApi.unlinkVpnServicePool(current.id, tunnelPoolId));
      toastService.success("Region withdrawn", "The interface is being re-pushed without the service's devices.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unlink the interface");
    } finally {
      setBusyPoolId(null);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Regions: ${current.name}`} size="2xl">
      <div className="space-y-6">
        <p className="text-sm text-gray-400">
          Every device on this service gets one address that is valid on all of these interfaces, so an interface must
          carry the same address block as the others. One already terminating another service is refused rather than
          repointed.
        </p>

        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">Linked ({current.regions.length})</h4>
          {current.regions.length === 0 ? (
            <p className="text-sm text-gray-500">
              None. The service cannot serve anybody until at least one interface is linked.
            </p>
          ) : (
            <ul className="space-y-2">
              {current.regions.map((region) => (
                <li
                  key={region.tunnel_pool_id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm text-white">
                      <GlobeAltIcon className="h-4 w-4 shrink-0 text-gray-400" />
                      {region.region_name}
                      {!region.enabled && <StatusBadge status="inactive">Interface down</StatusBadge>}
                    </div>
                    <div className="mt-0.5 truncate font-mono text-[11px] text-gray-500">
                      {region.endpoint} · {region.public_key.slice(0, 16)}…
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300"
                    title="Withdraw this region"
                    disabled={busyPoolId === region.tunnel_pool_id}
                    onClick={() => handleUnlink(region.tunnel_pool_id, region.region_name)}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">Available tunnel pools</h4>
          {loadingPools ? (
            <p className="text-sm text-gray-500">Loading tunnel pools…</p>
          ) : available.length === 0 ? (
            <p className="text-sm text-gray-500">
              No unlinked tunnel pools. Create one on the{" "}
              <Link to="/tunnel-pools" className="text-blue-400 hover:underline">
                Tunnel Pools
              </Link>{" "}
              page.
            </p>
          ) : (
            <ul className="space-y-2">
              {available.map((pool) => (
                <li
                  key={pool.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">
                      {pool.name} <span className="text-gray-500">· {pool.region_name}</span>
                    </div>
                    <div className="mt-0.5 truncate font-mono text-[11px] text-gray-500">
                      {pool.interface} on {pool.router_name} · {pool.cidr4 ?? "—"} {pool.cidr6 ?? ""}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busyPoolId === pool.id}
                    onClick={() => handleLink(pool)}
                  >
                    <LinkIcon className="h-4 w-4 mr-1" />
                    {busyPoolId === pool.id ? "Linking…" : "Link"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-900 rounded-lg p-3 text-red-300 text-sm">{error}</div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
