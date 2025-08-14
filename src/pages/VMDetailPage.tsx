import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAdminApi } from "../hooks/useAdminApi";
import { PaginatedTable } from "../components/PaginatedTable";
import { Button } from "../components/Button";
import { StatusBadge } from "../components/StatusBadge";
import { Profile } from "../components/Profile";
import { VmStatusBadge, getVmStatus } from "../components/VmStatusBadge";
import { ErrorState } from "../components/ErrorState";
import {
  AdminVmInfo,
  VmRunningStates,
  AdminVmHistoryInfo,
  AdminVmPaymentInfo,
  AdminVmHistoryActionType,
  AdminPaymentMethod,
} from "../lib/api";
import { formatBytes } from "../utils/formatBytes";
import { formatSats } from "../utils/formatSats";
import {
  PlayIcon,
  StopIcon,
  TrashIcon,
  ArrowPathIcon,
  ClockIcon,
  CreditCardIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

export function VMDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const adminApi = useAdminApi();
  const [vm, setVm] = useState<AdminVmInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const vmId = id ? parseInt(id, 10) : null;

  const loadVM = async (isRefresh = false) => {
    if (!vmId) {
      setError("Invalid VM ID");
      setLoading(false);
      return;
    }

    try {
      if (!isRefresh) {
        setLoading(true);
      }
      const vmData = await adminApi.getVM(vmId);
      setVm(vmData);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Failed to load VM:", err);
      setError(err instanceof Error ? err.message : "Failed to load VM");
    } finally {
      if (!isRefresh) {
        setLoading(false);
      }
    }
  };

  // Initial load
  useEffect(() => {
    loadVM();
  }, [vmId, adminApi]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!vm || actionLoading) return;

    const interval = setInterval(() => {
      loadVM(true);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [vm, vmId, adminApi, actionLoading]);

  const handleStartVM = async () => {
    if (!vm) return;
    try {
      setActionLoading("start");
      await adminApi.startVM(vm.id);
      await loadVM(true);
      setHistoryRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("Failed to start VM:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopVM = async () => {
    if (!vm) return;
    try {
      setActionLoading("stop");
      await adminApi.stopVM(vm.id);
      await loadVM(true);
      setHistoryRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("Failed to stop VM:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteVM = async () => {
    if (!vm) return;
    if (confirm(`Are you sure you want to delete VM ${vm.id}?`)) {
      const reason = prompt(
        "Optional: Enter a reason for deletion (e.g., 'Policy violation', 'User requested'):",
      );
      try {
        setActionLoading("delete");
        await adminApi.deleteVM(vm.id, reason || undefined);
        navigate("/vms");
      } catch (error) {
        console.error("Failed to delete VM:", error);
        setActionLoading(null);
      }
    }
  };

  const handleExtendVM = async () => {
    if (!vm) return;
    const daysInput = prompt(
      "Enter the number of days to extend the VM (1-365):",
      "30"
    );
    if (!daysInput) return;
    
    const days = parseInt(daysInput, 10);
    if (isNaN(days) || days < 1 || days > 365) {
      alert("Please enter a valid number of days between 1 and 365.");
      return;
    }
    
    const reason = prompt(
      "Optional: Enter a reason for extending the VM:",
    );
    
    try {
      setActionLoading("extend");
      await adminApi.extendVM(vm.id, days, reason || undefined);
      await loadVM(true);
      setHistoryRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("Failed to extend VM:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const renderHistoryHeader = () => (
    <>
      <th>Action</th>
      <th>Description</th>
      <th>Initiated By</th>
      <th>Date</th>
    </>
  );

  const renderHistoryRow = (history: AdminVmHistoryInfo, index: number) => (
    <tr key={history.id || index}>
      <td>
        <StatusBadge
          status="unknown"
          colorOverride={getHistoryColorOverride(history.action_type)}
        >
          {formatActionType(history.action_type)}
        </StatusBadge>
      </td>
      <td className="text-gray-300 text-sm">{history.description || "-"}</td>
      <td>
        {history.initiated_by_user_pubkey ? (
          <Profile pubkey={history.initiated_by_user_pubkey} avatarSize="sm" />
        ) : (
          <span className="text-gray-400 text-sm">System</span>
        )}
      </td>
      <td className="text-gray-400 text-sm">
        {new Date(history.timestamp).toLocaleString()}
      </td>
    </tr>
  );

  const renderPaymentsHeader = () => (
    <>
      <th>ID</th>
      <th>Amount</th>
      <th>Method</th>
      <th>Status</th>
      <th>Date</th>
    </>
  );

  const renderPaymentsRow = (payment: AdminVmPaymentInfo, index: number) => (
    <tr key={payment.id || index}>
      <td className="font-mono text-sm text-blue-400">
        {payment.id.slice(0, 8)}...
      </td>
      <td className="text-white">
        <div className="space-y-1">
          <div>
            {formatPaymentAmount(
              payment.amount,
              payment.currency,
              payment.rate,
            )}
          </div>
          {payment.rate && payment.rate !== 100 && (
            <div className="text-xs text-gray-400">
              Rate: {payment.rate.toLocaleString()}
            </div>
          )}
        </div>
      </td>
      <td>
        <StatusBadge status={getPaymentMethodColor(payment.payment_method)}>
          {formatPaymentMethod(payment.payment_method)}
        </StatusBadge>
      </td>
      <td>
        <div className="flex items-center space-x-2">
          {payment.is_paid ? (
            <CheckCircleIcon className="h-4 w-4 text-green-400" />
          ) : (
            <XCircleIcon className="h-4 w-4 text-red-400" />
          )}
          <span className={payment.is_paid ? "text-green-400" : "text-red-400"}>
            {payment.is_paid ? "Paid" : "Pending"}
          </span>
        </div>
      </td>
      <td className="text-gray-400 text-sm">
        {new Date(payment.created).toLocaleString()}
      </td>
    </tr>
  );

  const getHistoryColorOverride = (
    action: AdminVmHistoryActionType,
  ): string => {
    switch (action) {
      case AdminVmHistoryActionType.STARTED:
        return "bg-green-900 text-green-300"; // Green for started
      case AdminVmHistoryActionType.CREATED:
        return "bg-blue-900 text-blue-300"; // Blue for created
      case AdminVmHistoryActionType.PAYMENT_RECEIVED:
        return "bg-emerald-900 text-emerald-300"; // Emerald for payments
      case AdminVmHistoryActionType.RENEWED:
        return "bg-cyan-900 text-cyan-300"; // Cyan for renewed
      case AdminVmHistoryActionType.STOPPED:
        return "bg-red-900 text-red-300"; // Red for stopped
      case AdminVmHistoryActionType.DELETED:
        return "bg-rose-900 text-rose-300"; // Rose for deleted
      case AdminVmHistoryActionType.EXPIRED:
        return "bg-orange-900 text-orange-300"; // Orange for expired
      case AdminVmHistoryActionType.RESTARTED:
        return "bg-purple-900 text-purple-300"; // Purple for restarted
      case AdminVmHistoryActionType.REINSTALLED:
        return "bg-indigo-900 text-indigo-300"; // Indigo for reinstalled
      case AdminVmHistoryActionType.CONFIGURATION_CHANGED:
        return "bg-yellow-900 text-yellow-300"; // Yellow for config changes
      case AdminVmHistoryActionType.STATE_CHANGED:
        return "bg-amber-900 text-amber-300"; // Amber for state changes
      default:
        return "bg-gray-900 text-gray-300"; // Gray for unknown
    }
  };

  const formatActionType = (action: AdminVmHistoryActionType): string => {
    return action.charAt(0).toUpperCase() + action.slice(1).replace(/_/g, " ");
  };

  const getPaymentMethodColor = (
    method: AdminPaymentMethod,
  ): "running" | "stopped" | "unknown" => {
    switch (method) {
      case AdminPaymentMethod.LIGHTNING:
        return "running";
      case AdminPaymentMethod.PAYPAL:
        return "unknown";
      case AdminPaymentMethod.REVOLUT:
        return "stopped";
      default:
        return "unknown";
    }
  };

  const formatPaymentMethod = (method: AdminPaymentMethod): string => {
    switch (method) {
      case AdminPaymentMethod.LIGHTNING:
        return "Lightning";
      case AdminPaymentMethod.PAYPAL:
        return "PayPal";
      case AdminPaymentMethod.REVOLUT:
        return "Revolut";
      default:
        return method;
    }
  };

  const formatPaymentAmount = (
    amount: number,
    currency: string,
    rate?: number,
  ): string => {
    let primaryAmount: string;
    let baseAmount: number | null = null;

    if (currency.toLowerCase() === "btc") {
      // Amount is in milli-sats, convert to sats for display
      primaryAmount = formatSats(Math.floor(amount / 1000));
      // For BTC: convert milli-sats to BTC (divide by 100,000,000,000), then multiply by rate
      if (rate) {
        const btcAmount = amount / 100_000_000_000; // Convert milli-sats to BTC
        baseAmount = btcAmount * rate; // BTC amount * EUR rate = EUR amount
      }
    } else {
      primaryAmount = `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
      // For fiat currencies, rate converts to EUR
      if (rate && currency.toLowerCase() !== "eur") {
        baseAmount = (amount / 100) * rate;
      }
    }

    // Add base currency (EUR) equivalent if available and not already EUR
    if (baseAmount !== null) {
      return `${primaryAmount} (€${baseAmount.toFixed(2)})`;
    }

    return primaryAmount;
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatTimeUntilExpiry = (
    expiryDate: string,
  ): { text: string; isExpired: boolean; isExpiringSoon: boolean } => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffMs = expiry.getTime() - now.getTime();

    if (diffMs <= 0) {
      return { text: "Expired", isExpired: true, isExpiringSoon: false };
    }

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    // Consider "expiring soon" if less than 24 hours
    const isExpiringSoon = diffMs < 24 * 60 * 60 * 1000;

    if (days > 0) {
      return {
        text: `${days}d ${hours}h remaining`,
        isExpired: false,
        isExpiringSoon: days < 1,
      };
    } else if (hours > 0) {
      return {
        text: `${hours}h ${minutes}m remaining`,
        isExpired: false,
        isExpiringSoon: true,
      };
    } else {
      return {
        text: `${minutes}m remaining`,
        isExpired: false,
        isExpiringSoon: true,
      };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-gray-400">Loading VM details...</div>
      </div>
    );
  }

  if (error || !vm) {
    return (
      <ErrorState error={new Error(error || "VM not found")} action="load VM details" />
    );
  }

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">VM #{vm.id}</h1>
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <span>{vm.image_name}</span>
            <span>•</span>
            <span>{vm.template_name}</span>
            <span>•</span>
            <span>
              {vm.cpu}C • {formatBytes(vm.memory)} • {formatBytes(vm.disk_size)}
            </span>
            {vm.region_name && (
              <>
                <span>•</span>
                <span>{vm.region_name}</span>
              </>
            )}
            {lastRefresh && (
              <>
                <span>•</span>
                <span className="text-xs">
                  Updated: {lastRefresh.toLocaleTimeString()}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            onClick={() => loadVM(true)}
            disabled={!!actionLoading}
            className="text-blue-400 hover:text-blue-300 p-2"
            title="Refresh VM info"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </Button>
          {getVmStatus(vm) === VmRunningStates.STOPPED && (
            <Button
              variant="secondary"
              onClick={handleStartVM}
              disabled={actionLoading === "start"}
              className="text-green-400 hover:text-green-300 p-2"
            >
              <PlayIcon className="h-4 w-4" />
            </Button>
          )}
          {getVmStatus(vm) === VmRunningStates.RUNNING && (
            <Button
              variant="secondary"
              onClick={handleStopVM}
              disabled={actionLoading === "stop"}
              className="text-yellow-400 hover:text-yellow-300 p-2"
            >
              <StopIcon className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={handleExtendVM}
            disabled={actionLoading === "extend"}
            className="text-blue-400 hover:text-blue-300 p-2"
            title="Extend VM expiry"
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            onClick={handleDeleteVM}
            disabled={actionLoading === "delete"}
            className="text-red-400 hover:text-red-300 p-2"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Compact Info Grid */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
          <div>
            <div className="text-gray-400 mb-1">Owner</div>
            {vm.user_pubkey ? (
              <Profile pubkey={vm.user_pubkey} avatarSize="sm" />
            ) : (
              <span className="text-gray-500">-</span>
            )}
          </div>
          <div>
            <div className="text-gray-400 mb-1">Host</div>
            <div className="text-white">{vm.host_name || `#${vm.host_id}`}</div>
          </div>
          <div>
            <div className="text-gray-400 mb-1">IPs</div>
            <div className="space-y-1">
              {vm.ip_addresses.length > 0 ? (
                vm.ip_addresses.map((ip, idx) => (
                  <div key={idx} className="font-mono text-white text-xs">
                    {ip.ip}
                  </div>
                ))
              ) : (
                <span className="text-gray-500">None</span>
              )}
            </div>
          </div>
          <div>
            <div className="text-gray-400 mb-1">MAC</div>
            <div className="font-mono text-white text-xs">{vm.mac_address}</div>
          </div>
          <div>
            <div className="text-gray-400 mb-1">Created</div>
            <div className="text-white">
              {new Date(vm.created).toLocaleString()}
            </div>
            {vm.auto_renewal_enabled === true && (
              <StatusBadge status="running" className="mt-1">
                Auto-Renew
              </StatusBadge>
            )}
          </div>
          <div>
            <div className="text-gray-400 mb-1">Expires</div>
            <div className="space-y-1">
              <div
                className={
                  new Date(vm.expires) < new Date()
                    ? "text-red-400"
                    : "text-white"
                }
              >
                {new Date(vm.expires).toLocaleString()}
              </div>
              {(() => {
                const expiryInfo = formatTimeUntilExpiry(vm.expires);
                return (
                  <div
                    className={`text-xs ${
                      expiryInfo.isExpired
                        ? "text-red-400"
                        : expiryInfo.isExpiringSoon
                          ? "text-yellow-400"
                          : "text-gray-400"
                    }`}
                  >
                    {expiryInfo.text}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Real-time VM Metrics */}
      {vm.running_state && (
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">
              Real-time Metrics
            </h3>
            <div className="text-xs text-gray-400">
              Last updated:{" "}
              {new Date(vm.running_state.timestamp * 1000).toLocaleString()}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
            <div>
              <div className="text-gray-400 mb-1">Runtime State</div>
              <VmStatusBadge vm={vm} />
            </div>
            <div>
              <div className="text-gray-400 mb-1">CPU Usage</div>
              <div className="text-white">
                {(vm.running_state.cpu_usage * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Memory Usage</div>
              <div className="text-white">
                {(vm.running_state.mem_usage * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Uptime</div>
              <div className="text-white">
                {formatUptime(vm.running_state.uptime)}
              </div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Network I/O</div>
              <div className="text-white text-xs">
                <div>↓ {formatBytes(vm.running_state.net_in)}</div>
                <div>↑ {formatBytes(vm.running_state.net_out)}</div>
              </div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Disk I/O</div>
              <div className="text-white text-xs">
                <div>R: {formatBytes(vm.running_state.disk_read)}</div>
                <div>W: {formatBytes(vm.running_state.disk_write)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {vm.deleted && (
        <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-3">
          <div className="text-red-400 font-semibold">⚠️ Deleted VM</div>
          <div className="text-gray-400 text-sm">
            This virtual machine has been marked as deleted.
          </div>
        </div>
      )}

      {/* VM History */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
          <ClockIcon className="h-5 w-5" />
          <span>History</span>
        </h2>
        <PaginatedTable
          apiCall={(params) => adminApi.getVMHistory(vm.id, params)}
          renderHeader={renderHistoryHeader}
          renderRow={renderHistoryRow}
          itemsPerPage={10}
          errorAction="load VM history"
          loadingMessage="Loading VM history..."
          dependencies={[vm.id, historyRefreshKey]}
          calculateStats={(histories, total) => (
            <div className="text-sm text-gray-400">
              Total history entries:{" "}
              <span className="text-white font-medium">{total}</span>
            </div>
          )}
        />
      </div>

      {/* VM Payments */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
          <CreditCardIcon className="h-5 w-5" />
          <span>Payments</span>
        </h2>
        <PaginatedTable
          apiCall={async () => {
            const payments = await adminApi.getVMPayments(vm.id);
            return {
              data: payments,
              total: payments.length,
              limit: payments.length,
              offset: 0,
            };
          }}
          renderHeader={renderPaymentsHeader}
          renderRow={renderPaymentsRow}
          itemsPerPage={10}
          errorAction="load VM payments"
          loadingMessage="Loading VM payments..."
          dependencies={[vm.id]}
          calculateStats={(payments, total) => (
            <div className="flex gap-4 text-sm text-gray-400">
              <span>
                Total payments:{" "}
                <span className="text-white font-medium">{total}</span>
              </span>
              <span>
                Paid:{" "}
                <span className="text-green-400 font-medium">
                  {payments.filter((p) => p.is_paid).length}
                </span>
              </span>
              <span>
                Pending:{" "}
                <span className="text-red-400 font-medium">
                  {payments.filter((p) => !p.is_paid).length}
                </span>
              </span>
            </div>
          )}
        />
      </div>
    </div>
  );
}
