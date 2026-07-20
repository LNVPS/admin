import {
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
  CheckCircleIcon,
  CheckIcon,
  ClipboardIcon,
  ClockIcon,
  CreditCardIcon,
  GlobeAltIcon,
  NoSymbolIcon,
  PlayIcon,
  PlusIcon,
  StopIcon,
  TrashIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/Button";
import { ErrorState } from "../components/ErrorState";
import { PaginatedTable } from "../components/PaginatedTable";
import { PermissionGuard } from "../components/PermissionGuard";
import { Profile } from "../components/Profile";
import { StatusBadge } from "../components/StatusBadge";
import { VmIpAssignmentModal } from "../components/VmIpAssignmentModal";
import { VmRefundModal } from "../components/VmRefundModal";
import { VmTransferModal } from "../components/VmTransferModal";
import { getVmStatus, VmStatusBadge } from "../components/VmStatusBadge";
import { useAdminApi } from "../hooks/useAdminApi";
import { useUserRoles } from "../hooks/useUserRoles";
import {
  AdminPaymentMethod,
  AdminVmHistoryActionType,
  type AdminVmHistoryInfo,
  type AdminVmInfo,
  type AdminVmPaymentInfo,
  VmRunningStates,
} from "../lib/api";
import { CURRENCIES, formatCurrency } from "../utils/currency";
import { formatBytes } from "../utils/formatBytes";

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
  const [paymentsRefreshKey, setPaymentsRefreshKey] = useState(0);
  const [showIpAssignModal, setShowIpAssignModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const { isSuperAdmin } = useUserRoles();
  const [copiedPaymentId, setCopiedPaymentId] = useState<string | null>(null);
  const [copiedExternalId, setCopiedExternalId] = useState<string | null>(null);

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
      const result = await adminApi.startVM(vm.id);
      console.log("Start VM job dispatched:", result.job_id);
      await loadVM(true);
      setHistoryRefreshKey((prev) => prev + 1);
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
      const result = await adminApi.stopVM(vm.id);
      console.log("Stop VM job dispatched:", result.job_id);
      await loadVM(true);
      setHistoryRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to stop VM:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteVM = async () => {
    if (!vm) return;
    if (confirm(`Are you sure you want to delete VM ${vm.id}?`)) {
      const reason = prompt("Optional: Enter a reason for deletion (e.g., 'Policy violation', 'User requested'):");
      try {
        setActionLoading("delete");
        const result = await adminApi.deleteVM(vm.id, reason || undefined);
        console.log("Delete VM job dispatched:", result.job_id);
        navigate("/vms");
      } catch (error) {
        console.error("Failed to delete VM:", error);
        setActionLoading(null);
      }
    }
  };

  const handlePurgeVM = async () => {
    if (!vm) return;
    if (
      confirm(
        `PERMANENTLY delete (purge) VM ${vm.id}, including all payment history and related records? This cannot be undone.`,
      )
    ) {
      const reason = prompt("Optional: Enter a reason for purging this VM (e.g., 'Test VM'):");
      try {
        setActionLoading("purge");
        const result = await adminApi.deleteVM(vm.id, reason || undefined, true);
        console.log("Purge VM job dispatched:", result.job_id);
        navigate("/vms");
      } catch (error) {
        console.error("Failed to purge VM:", error);
        setActionLoading(null);
      }
    }
  };

  const handleExtendVM = async () => {
    if (!vm) return;
    const daysInput = prompt("Enter the number of days to extend the VM (1-365):", "30");
    if (!daysInput) return;

    const days = parseInt(daysInput, 10);
    if (isNaN(days) || days < 1 || days > 365) {
      alert("Please enter a valid number of days between 1 and 365.");
      return;
    }

    const reason = prompt("Optional: Enter a reason for extending the VM:");

    try {
      setActionLoading("extend");
      await adminApi.extendVM(vm.id, days, reason || undefined);
      await loadVM(true);
      setHistoryRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to extend VM:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleDisabled = async () => {
    if (!vm) return;
    const currentlyDisabled = (vm as { disabled?: boolean }).disabled ?? false;
    const action = currentlyDisabled ? "enable" : "disable";

    if (!confirm(`Are you sure you want to ${action} this VM?`)) return;

    try {
      setActionLoading("toggle-disabled");
      const result = await adminApi.updateVM(vm.id, { disabled: !currentlyDisabled });
      if (result.job_id) {
        console.log(`${action} VM job dispatched:`, result.job_id);
      }
      await loadVM(true);
      setHistoryRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error(`Failed to ${action} VM:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopyPaymentId = async (paymentId: string) => {
    try {
      await navigator.clipboard.writeText(paymentId);
      setCopiedPaymentId(paymentId);
      setTimeout(() => setCopiedPaymentId(null), 2000);
    } catch (err) {
      console.error("Failed to copy payment ID:", err);
    }
  };

  const handleCopyExternalId = async (externalId: string) => {
    try {
      await navigator.clipboard.writeText(externalId);
      setCopiedExternalId(externalId);
      setTimeout(() => setCopiedExternalId(null), 2000);
    } catch (err) {
      console.error("Failed to copy external ID:", err);
    }
  };

  const handleCompletePayment = async (payment: AdminVmPaymentInfo) => {
    if (!vm) return;
    if (!confirm(`Manually complete payment ${payment.id.slice(0, 8)}...?`)) return;
    try {
      await adminApi.completeVMPayment(vm.id, payment.id);
      setPaymentsRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to complete payment");
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
      <td className="align-top">
        <StatusBadge status="unknown" colorOverride={getHistoryColorOverride(history.action_type)}>
          {formatActionType(history.action_type)}
        </StatusBadge>
      </td>
      <td className="align-top text-gray-300 text-sm">
        <div className="min-w-0 max-w-[24rem] break-words">{history.description || "-"}</div>
      </td>
      <td className="align-top">
        {history.initiated_by_user_pubkey ? (
          <Profile pubkey={history.initiated_by_user_pubkey} avatarSize="sm" />
        ) : (
          <span className="text-gray-400 text-sm">System</span>
        )}
      </td>
      <td className="align-top whitespace-nowrap text-gray-400 text-sm">
        {new Date(history.timestamp).toLocaleString()}
      </td>
    </tr>
  );

  const renderPaymentsHeader = () => (
    <>
      <th>ID</th>
      <th>Amount</th>
      <th>External ID</th>
      <th>Method &amp; Status</th>
      <th>Date</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderPaymentsRow = (payment: AdminVmPaymentInfo, index: number) => (
    <tr key={payment.id || index}>
      {/* ID */}
      <td className="align-top font-mono text-sm text-blue-400">
        <span className="inline-flex items-center gap-1">
          <span title={payment.id}>{payment.id.slice(0, 8)}...</span>
          <button
            type="button"
            onClick={() => handleCopyPaymentId(payment.id)}
            className="text-gray-400 hover:text-blue-400 transition-colors cursor-pointer"
            title={copiedPaymentId === payment.id ? "Copied!" : "Copy payment ID"}
          >
            {copiedPaymentId === payment.id ? (
              <CheckIcon className="h-3 w-3 text-green-400" />
            ) : (
              <ClipboardIcon className="h-3 w-3" />
            )}
          </button>
        </span>
      </td>
      {/* Amount: total + rate / base / tax / fee */}
      <td className="align-top">
        <div className="min-w-0 max-w-[16rem]">
          <div className="font-medium text-slate-100">{formatCurrency(payment.amount, payment.currency)}</div>
          <div className="mt-0.5 space-y-0.5 font-mono text-xs text-slate-400">
            {payment.rate && payment.rate !== 1 && (
              <div>
                Rate:{" "}
                {payment.company_base_currency
                  ? new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: payment.company_base_currency,
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    }).format(payment.rate)
                  : Number.isInteger(payment.rate)
                    ? payment.rate.toString()
                    : payment.rate.toFixed(2)}
              </div>
            )}
            {payment.rate && payment.company_base_currency && payment.currency !== payment.company_base_currency && (
              <div>
                Base: {formatBaseAmount(payment.amount, payment.currency, payment.rate, payment.company_base_currency)}
              </div>
            )}
            {payment.tax > 0 && <div>Tax: {formatCurrency(payment.tax, payment.currency)}</div>}
            {payment.processing_fee > 0 && (
              <div>Fee: {formatCurrency(payment.processing_fee, payment.currency)}</div>
            )}
          </div>
        </div>
      </td>
      {/* External ID */}
      <td className="align-top font-mono text-sm text-gray-300">
        {payment.external_id ? (
          <span className="inline-flex items-center gap-1">
            <span title={payment.external_id}>{payment.external_id.slice(0, 12)}...</span>
            <button
              type="button"
              onClick={() => handleCopyExternalId(payment.external_id!)}
              className="text-gray-400 hover:text-blue-400 transition-colors cursor-pointer"
              title={copiedExternalId === payment.external_id ? "Copied!" : "Copy external ID"}
            >
              {copiedExternalId === payment.external_id ? (
                <CheckIcon className="h-3 w-3 text-green-400" />
              ) : (
                <ClipboardIcon className="h-3 w-3" />
              )}
            </button>
          </span>
        ) : (
          <span className="text-gray-600">—</span>
        )}
      </td>
      {/* Method & Status */}
      <td className="align-top">
        <StatusBadge status={getPaymentMethodColor(payment.payment_method)}>
          {formatPaymentMethod(payment.payment_method)}
        </StatusBadge>
        <div className="mt-1 flex items-center space-x-2">
          {payment.is_paid ? (
            <CheckCircleIcon className="h-4 w-4 text-green-400" />
          ) : new Date(payment.expires) < new Date() ? (
            <ClockIcon className="h-4 w-4 text-gray-400" />
          ) : (
            <XCircleIcon className="h-4 w-4 text-red-400" />
          )}
          <span
            className={
              payment.is_paid
                ? "text-green-400"
                : new Date(payment.expires) < new Date()
                  ? "text-gray-400"
                  : "text-red-400"
            }
          >
            {payment.is_paid ? "Paid" : new Date(payment.expires) < new Date() ? "Expired" : "Pending"}
          </span>
        </div>
      </td>
      {/* Date */}
      <td className="align-top text-gray-400 text-sm">
        <div className="space-y-0.5">
          <div>{new Date(payment.created).toLocaleString()}</div>
          {payment.paid_at && (
            <div className="text-green-400 text-xs">Paid: {new Date(payment.paid_at).toLocaleString()}</div>
          )}
        </div>
      </td>
      {/* Actions */}
      <td className="align-top text-right">
        <PermissionGuard requiredPermissions={["payments::update"]}>
          {!payment.is_paid && new Date(payment.expires) > new Date() && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleCompletePayment(payment)}
              title="Manually mark this payment as paid"
            >
              Complete
            </Button>
          )}
        </PermissionGuard>
      </td>
    </tr>
  );

  const getHistoryColorOverride = (action: AdminVmHistoryActionType): string => {
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
      case AdminVmHistoryActionType.TRANSFERRED:
        return "bg-teal-900 text-teal-300"; // Teal for transfers
      case AdminVmHistoryActionType.STATE_CHANGED:
        return "bg-amber-900 text-amber-300"; // Amber for state changes
      default:
        return "bg-gray-900 text-gray-300"; // Gray for unknown
    }
  };

  const formatActionType = (action: AdminVmHistoryActionType): string => {
    return action.charAt(0).toUpperCase() + action.slice(1).replace(/_/g, " ");
  };

  const getPaymentMethodColor = (method: AdminPaymentMethod): "running" | "stopped" | "unknown" => {
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

  const formatBaseAmount = (amount: number, currency: string, rate: number, company_base_currency: string): string => {
    if (!rate || !company_base_currency || currency === company_base_currency) {
      return "—";
    }

    // Convert amount (in smallest units) to base currency smallest units using the exchange rate.
    // rate is expressed as base_currency per 1 BTC (e.g. 58000 EUR/BTC).
    let baseAmount: number;
    if (currency === "BTC") {
      // amount is in millisats; 1 BTC = 1e11 millisats; result in cents
      // baseAmount_cents = (amount_millisats / 1e11) * rate * 100 = amount * rate / 1e9
      baseAmount = Math.round((amount * rate) / 1e9);
    } else if (company_base_currency === "BTC") {
      // amount is in cents; result in millisats
      baseAmount = Math.round(amount * rate * 1e9);
    } else {
      // fiat to fiat: amount in cents, rate is e.g. EUR/USD
      baseAmount = Math.round(amount * rate);
    }

    return formatCurrency(baseAmount, company_base_currency);
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

  const formatTimeUntilExpiry = (expiryDate: string): { text: string; isExpired: boolean; isExpiringSoon: boolean } => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffMs = expiry.getTime() - now.getTime();

    if (diffMs <= 0) {
      return { text: "Expired", isExpired: true, isExpiringSoon: false };
    }

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

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
    return <ErrorState error={new Error(error || "VM not found")} action="load VM details" />;
  }

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-white">VM #{vm.id}</h1>
            <VmStatusBadge vm={vm} />
            {vm.disabled && <StatusBadge status="disabled" />}
            {vm.deleted && <StatusBadge status="stopped">DELETED</StatusBadge>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-400">
            <span>{vm.image_name}</span>
            <span className="text-slate-600">•</span>
            <span>{vm.template_name}</span>
            <span className="text-slate-600">•</span>
            <span className="font-mono text-xs">
              {vm.cpu}C • {formatBytes(vm.memory)} • {formatBytes(vm.disk_size)}
            </span>
            {vm.region_name && (
              <>
                <span className="text-slate-600">•</span>
                <span>{vm.region_name}</span>
              </>
            )}
            {lastRefresh && (
              <>
                <span className="text-slate-600">•</span>
                <span className="text-xs">Updated {lastRefresh.toLocaleTimeString()}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            onClick={() => loadVM(true)}
            disabled={!!actionLoading}
            className="text-slate-400 hover:text-white p-2"
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
              title="Start VM"
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
              title="Stop VM"
            >
              <StopIcon className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={handleExtendVM}
            disabled={actionLoading === "extend"}
            className="text-slate-400 hover:text-white p-2"
            title="Extend VM expiry"
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowIpAssignModal(true)}
            disabled={!!actionLoading}
            className="text-slate-400 hover:text-white p-2"
            title="Assign IP address"
          >
            <GlobeAltIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowRefundModal(true)}
            disabled={!!actionLoading}
            className="text-slate-400 hover:text-white p-2"
            title="Process refund"
          >
            <BanknotesIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            onClick={handleToggleDisabled}
            disabled={actionLoading === "toggle-disabled"}
            className="text-slate-400 hover:text-white p-2"
            title={vm.disabled ? "Enable VM" : "Disable VM"}
          >
            <NoSymbolIcon className="h-4 w-4" />
          </Button>
          <PermissionGuard requiredPermissions={["virtual_machines::update"]} fallback={null}>
            <Button
              variant="secondary"
              onClick={() => setShowTransferModal(true)}
              disabled={!!actionLoading}
              className="text-slate-400 hover:text-white p-2"
              title="Transfer VM to another user"
            >
              <ArrowsRightLeftIcon className="h-4 w-4" />
            </Button>
          </PermissionGuard>
          <Button
            variant="secondary"
            onClick={handleDeleteVM}
            disabled={actionLoading === "delete"}
            className="text-red-400 hover:text-red-300 p-2"
            title="Delete VM"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
          {isSuperAdmin && (
            <Button
              variant="secondary"
              onClick={handlePurgeVM}
              disabled={actionLoading === "purge"}
              className="text-red-500 hover:text-red-400 p-2"
              title="Permanently delete (purge) VM — super admin only"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Compact Info Grid */}
      <div className="bg-gray-800 border border-slate-700 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="min-w-0">
            <div className="text-gray-400 mb-1">Owner</div>
            {vm.user_pubkey ? (
              <Profile pubkey={vm.user_pubkey} avatarSize="sm" />
            ) : (
              <span className="text-gray-500">-</span>
            )}
            {vm.subscription && (
              <Link
                to={`/subscriptions/${vm.subscription.id}`}
                className="mt-1 block truncate text-xs text-blue-400 hover:text-blue-300 hover:underline"
                title={vm.subscription.name}
              >
                sub: {vm.subscription.name || `#${vm.subscription.id}`}
              </Link>
            )}
            {vm.ref_code && (
              <div className="mt-0.5 truncate font-mono text-xs text-slate-400" title={vm.ref_code}>
                ref: {vm.ref_code}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-gray-400 mb-1">Host &amp; Network</div>
            <div className="truncate text-white" title={vm.host_name || `#${vm.host_id}`}>
              {vm.host_name || `#${vm.host_id}`}
            </div>
            <div className="mt-1 space-y-1">
              <div className="truncate font-mono text-gray-400 text-xs" title={vm.mac_address}>
                {vm.mac_address}
              </div>
              {vm.ip_addresses.length > 0 ? (
                vm.ip_addresses.map((ip, idx) => (
                  <Link
                    key={idx}
                    to={`/ip-address/${encodeURIComponent(ip.ip)}`}
                    className="block truncate font-mono text-blue-400 hover:text-blue-300 hover:underline text-xs"
                    title={ip.ip}
                  >
                    {ip.ip}
                  </Link>
                ))
              ) : (
                <span className="text-gray-500">None</span>
              )}
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-gray-400 mb-1">Created</div>
            <div className="text-xs text-white">{new Date(vm.created).toLocaleString()}</div>
          </div>
          <div className="min-w-0">
            <div className="text-gray-400 mb-1">Expires</div>
            {vm.expires ? (
              <div className="space-y-1 text-xs">
                <div className={new Date(vm.expires) < new Date() ? "text-red-400" : "text-white"}>
                  {new Date(vm.expires).toLocaleString()}
                </div>
                {(() => {
                  const expiryInfo = formatTimeUntilExpiry(vm.expires);
                  return (
                    <div
                      className={
                        expiryInfo.isExpired
                          ? "text-red-400"
                          : expiryInfo.isExpiringSoon
                            ? "text-yellow-400"
                            : "text-gray-400"
                      }
                    >
                      {expiryInfo.text}
                    </div>
                  );
                })()}
                {vm.auto_renewal_enabled && <StatusBadge status="running">Auto-Renew</StatusBadge>}
              </div>
            ) : (
              <div className="text-xs text-yellow-400">N/A (pending)</div>
            )}
          </div>
        </div>
      </div>

      {/* Real-time VM Metrics */}
      {vm.running_state && (
        <div className="bg-gray-800 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">Real-time Metrics</h3>
            <div className="text-xs text-gray-400">
              Last updated: {new Date(vm.running_state.timestamp * 1000).toLocaleString()}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
            <div>
              <div className="text-gray-400 mb-1">Runtime State</div>
              <VmStatusBadge vm={vm} />
            </div>
            <div>
              <div className="text-gray-400 mb-1">CPU Usage</div>
              <div className="text-white">{(vm.running_state.cpu_usage * 100).toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Memory Usage</div>
              <div className="text-white">{(vm.running_state.mem_usage * 100).toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Uptime</div>
              <div className="text-white">{formatUptime(vm.running_state.uptime)}</div>
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
          <div className="text-gray-400 text-sm">This virtual machine has been marked as deleted.</div>
        </div>
      )}

      {/* VM History */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <ClockIcon className="h-5 w-5" />
            <span>History</span>
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setHistoryRefreshKey((k) => k + 1)}
            className="p-1"
            title="Refresh history"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </Button>
        </h2>
        <PaginatedTable
          apiCall={(params) => adminApi.getVMHistory(vm.id, params)}
          renderHeader={renderHistoryHeader}
          renderRow={renderHistoryRow}
          itemsPerPage={10}
          errorAction="load VM history"
          loadingMessage="Loading VM history..."
          minWidth="700px"
          dependencies={[vm.id, historyRefreshKey]}
          calculateStats={(_, total) => (
            <div className="text-sm text-gray-400">
              Total history entries: <span className="text-white font-medium">{total}</span>
            </div>
          )}
        />
      </div>

      {/* VM Payments */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <CreditCardIcon className="h-5 w-5" />
            <span>Payments</span>
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPaymentsRefreshKey((k) => k + 1)}
            className="p-1"
            title="Refresh payments"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </Button>
        </h2>
        <PaginatedTable
          apiCall={(params) => adminApi.getVMPayments(vm.id, params)}
          renderHeader={renderPaymentsHeader}
          renderRow={renderPaymentsRow}
          itemsPerPage={10}
          errorAction="load VM payments"
          loadingMessage="Loading VM payments..."
          minWidth="900px"
          dependencies={[vm.id, paymentsRefreshKey]}
          calculateStats={(payments, total) => (
            <div className="flex gap-4 text-sm text-gray-400">
              <span>
                Total payments: <span className="text-white font-medium">{total}</span>
              </span>
              <span>
                Paid: <span className="text-green-400 font-medium">{payments.filter((p) => p.is_paid).length}</span>
              </span>
              <span>
                Pending: <span className="text-red-400 font-medium">{payments.filter((p) => !p.is_paid).length}</span>
              </span>
            </div>
          )}
        />
      </div>

      {/* IP Assignment Modal */}
      <VmIpAssignmentModal
        isOpen={showIpAssignModal}
        onClose={() => setShowIpAssignModal(false)}
        vm={vm}
        onSuccess={() => {
          loadVM(true);
          setHistoryRefreshKey((prev) => prev + 1);
        }}
      />

      {/* Transfer Modal */}
      <VmTransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        vmId={vm.id}
        onTransferred={() => {
          loadVM(true);
          setHistoryRefreshKey((prev) => prev + 1);
        }}
      />

      {/* Refund Modal */}
      <VmRefundModal
        isOpen={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        vm={vm}
        onSuccess={() => {
          loadVM(true);
          setHistoryRefreshKey((prev) => prev + 1);
        }}
      />
    </div>
  );
}
