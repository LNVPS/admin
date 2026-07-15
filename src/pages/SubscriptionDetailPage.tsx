import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  BanknotesIcon,
  CheckCircleIcon,
  CheckIcon,
  ClipboardIcon,
  ClockIcon,
  CreditCardIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  PencilIcon,
  PlusIcon,
  ServerIcon,
  TrashIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ErrorState } from "../components/ErrorState";
import { Modal } from "../components/Modal";
import { PaginatedTable } from "../components/PaginatedTable";
import { Profile } from "../components/Profile";
import { StatusBadge } from "../components/StatusBadge";
import { useAdminApi } from "../hooks/useAdminApi";
import { useApiCall } from "../hooks/useApiCall";
import { useToast } from "../hooks/useToast";
import { useUserRoles } from "../hooks/useUserRoles";
import { EditSubscriptionModal } from "./SubscriptionsPage";
import {
  AdminPaymentMethod,
  type AdminSubscriptionInfo,
  type AdminSubscriptionLineItemInfo,
  type AdminSubscriptionLineItemResource,
  type AdminSubscriptionPaymentInfo,
} from "../lib/api";
import { formatCurrency } from "../utils/currency";

export function SubscriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const adminApi = useAdminApi();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showAddLineItem, setShowAddLineItem] = useState(false);
  const [showEditSubscription, setShowEditSubscription] = useState(false);
  const [editingLineItem, setEditingLineItem] = useState<AdminSubscriptionLineItemInfo | null>(null);

  const {
    data: subscription,
    loading,
    error,
    retry,
  } = useApiCall(() => adminApi.getSubscription(parseInt(id!, 10)), [id, refreshTrigger]);

  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleDeleteLineItem = async (lineItem: AdminSubscriptionLineItemInfo) => {
    if (!confirm(`Delete line item "${lineItem.name}"?`)) return;

    try {
      await adminApi.deleteSubscriptionLineItem(lineItem.id);
      refreshData();
    } catch (error) {
      // Error handled by API layer
    }
  };

  const handleDeleteSubscription = async () => {
    if (!subscription) return;
    if (!confirm(`Delete subscription "${subscription.name}"? This action cannot be undone.`)) return;

    try {
      await adminApi.deleteSubscription(subscription.id);
      navigate("/subscriptions");
    } catch (error) {
      // Error handled by API layer
    }
  };

  if (error) {
    return <ErrorState error={error} onRetry={retry} action="load subscription" />;
  }

  if (loading || !subscription) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-white">Loading subscription...</div>
      </div>
    );
  }

  const formatInterval = (amount: number, type: string) => {
    if (amount === 1) return `per ${type}`;
    return `every ${amount} ${type}s`;
  };

  // Resolve the line item's linked resource from the typed `resource` field.
  const getLinkedResource = (resource: AdminSubscriptionLineItemResource | null) => {
    if (!resource) return null;
    if (resource.type === "vps") {
      return { to: `/vms/${resource.vm_id}`, label: `VM #${resource.vm_id}`, icon: ServerIcon };
    }
    if (resource.type === "ip_range") {
      return {
        to: "/ip-spaces",
        label: `IP Range subscription #${resource.ip_range_subscription_id}`,
        icon: GlobeAltIcon,
      };
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-gray-400">
        <Link to="/subscriptions" className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300">
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Subscriptions
        </Link>
        <span className="text-gray-600">/</span>
        <span className="truncate text-gray-300" title={subscription.name}>
          {subscription.name}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{subscription.name}</h1>
            {subscription.is_active ? (
              <StatusBadge status="active">Active</StatusBadge>
            ) : (
              <StatusBadge status="inactive">Inactive</StatusBadge>
            )}
            {subscription.auto_renewal_enabled && <StatusBadge status="info">Auto-renew</StatusBadge>}
          </div>
          <div className="mt-1 flex gap-2 items-center text-sm text-gray-400 flex-wrap">
            <span>Subscription #{subscription.id}</span>
            <span>|</span>
            <Link
              to={`/users/${subscription.user_id}`}
              className="hover:opacity-80"
              title={`User #${subscription.user_id}`}
            >
              <Profile pubkey={subscription.user_pubkey} avatarSize="sm" />
            </Link>
            <span>|</span>
            <span>Created {new Date(subscription.created).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" size="sm" onClick={() => setShowEditSubscription(true)}>
            <PencilIcon className="h-4 w-4 mr-1.5" />
            Edit
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDeleteSubscription}
            className="text-red-400 hover:text-red-300"
          >
            <TrashIcon className="h-4 w-4 mr-1.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Details Card */}
      <Card>
        <div className="p-4">
          <h2 className="text-lg font-semibold text-white mb-4">Subscription Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-400 uppercase">Currency</div>
              <div className="text-white font-medium">{subscription.currency}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase">Billing Cycle</div>
              <div className="text-white font-medium">
                {formatInterval(subscription.interval_amount, subscription.interval_type)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase">Setup Fee</div>
              <div className="text-white font-medium">
                {formatCurrency(subscription.setup_fee, subscription.currency)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase">Expires</div>
              <div className="text-white font-medium">
                {subscription.expires ? new Date(subscription.expires).toLocaleString() : "Never"}
              </div>
            </div>
            {subscription.description && (
              <div className="col-span-2 min-w-0 md:col-span-4">
                <div className="text-xs text-gray-400 uppercase">Description</div>
                <div className="break-words text-gray-300">{subscription.description}</div>
              </div>
            )}
            {subscription.external_id && (
              <div className="col-span-2 min-w-0">
                <div className="text-xs text-gray-400 uppercase">External ID</div>
                <div className="break-all font-mono text-sm text-gray-300">{subscription.external_id}</div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Line Items */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <DocumentTextIcon className="h-5 w-5" />
            <span>Line Items</span>
          </span>
          <Button size="sm" onClick={() => setShowAddLineItem(true)}>
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Line Item
          </Button>
        </h2>

        {subscription.line_items.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No line items configured</div>
        ) : (
          <div className="space-y-2">
            {subscription.line_items.map((item) => {
              const linked = getLinkedResource(item.resource);
              return (
                <div key={item.id} className="bg-gray-700 rounded-lg p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="break-words font-medium text-white">{item.name}</div>
                    {item.description && <div className="break-words text-sm text-gray-400">{item.description}</div>}
                    <div className="mt-1 flex gap-4 text-sm text-gray-300">
                      <span>
                        Recurring: {formatCurrency(item.amount, subscription.currency)}{" "}
                        {formatInterval(subscription.interval_amount, subscription.interval_type)}
                      </span>
                      {item.setup_amount > 0 && (
                        <span>Setup: {formatCurrency(item.setup_amount, subscription.currency)}</span>
                      )}
                    </div>
                    {linked && (
                      <Link
                        to={linked.to}
                        className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300"
                      >
                        <linked.icon className="h-4 w-4" />
                        <span>{linked.label}</span>
                        <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                      </Link>
                    )}
                    {item.configuration && (
                      <div className="mt-1">
                        <details className="text-xs">
                          <summary className="text-gray-400 cursor-pointer hover:text-gray-300">
                            Upgrade details
                          </summary>
                          <pre className="mt-1 p-2 bg-gray-800 rounded text-gray-300 overflow-x-auto">
                            {JSON.stringify(item.configuration, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditingLineItem(item)}>
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteLineItem(item)}>
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payments */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <CreditCardIcon className="h-5 w-5" />
            <span>Payments</span>
          </span>
          <Button variant="secondary" size="sm" onClick={refreshData} className="p-1" title="Refresh payments">
            <ArrowPathIcon className="h-4 w-4" />
          </Button>
        </h2>
        <SubscriptionPaymentsTable subscriptionId={subscription.id} refreshKey={refreshTrigger} />
      </div>

      {/* Modals */}
      {showEditSubscription && (
        <EditSubscriptionModal
          subscription={subscription}
          onClose={() => setShowEditSubscription(false)}
          onSuccess={() => {
            setShowEditSubscription(false);
            refreshData();
          }}
        />
      )}

      {showAddLineItem && (
        <CreateLineItemModal
          subscriptionId={subscription.id}
          currency={subscription.currency}
          onClose={() => setShowAddLineItem(false)}
          onSuccess={() => {
            setShowAddLineItem(false);
            refreshData();
          }}
        />
      )}

      {editingLineItem && (
        <EditLineItemModal
          lineItem={editingLineItem}
          currency={subscription.currency}
          onClose={() => setEditingLineItem(null)}
          onSuccess={() => {
            setEditingLineItem(null);
            refreshData();
          }}
        />
      )}
    </div>
  );
}

function SubscriptionPaymentsTable({ subscriptionId, refreshKey }: { subscriptionId: number; refreshKey: number }) {
  const adminApi = useAdminApi();
  const { success, error: showError } = useToast();
  const { hasPermission } = useUserRoles();
  const [copiedPaymentId, setCopiedPaymentId] = useState<string | null>(null);
  const [copiedExternalId, setCopiedExternalId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [localRefresh, setLocalRefresh] = useState(0);

  const canCompletePayments = hasPermission("subscription_payments::update");

  const handleCompletePayment = async (payment: AdminSubscriptionPaymentInfo) => {
    if (
      !confirm(
        `Mark payment ${payment.id.slice(0, 8)}... (${formatCurrency(payment.amount, payment.currency)}) as paid? This extends the subscription by 30 days and activates it.`,
      )
    ) {
      return;
    }
    setCompletingId(payment.id);
    try {
      await adminApi.completeSubscriptionPayment(payment.id);
      success("Payment marked as paid");
      setLocalRefresh((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to complete payment:", error);
      showError("Failed to complete payment", error instanceof Error ? error.message : undefined);
    } finally {
      setCompletingId(null);
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

  const formatBaseAmount = (
    amount: number,
    pmtCurrency: string,
    rate: number,
    companyBaseCurrency: string | null,
  ): string => {
    if (!rate || !companyBaseCurrency || pmtCurrency === companyBaseCurrency) return "—";
    let baseAmount: number;
    if (pmtCurrency === "BTC") {
      baseAmount = Math.round((amount * rate) / 1e9);
    } else if (companyBaseCurrency === "BTC") {
      baseAmount = Math.round(amount * rate * 1e9);
    } else {
      baseAmount = Math.round(amount * rate);
    }
    return formatCurrency(baseAmount, companyBaseCurrency);
  };

  const renderHeader = () => (
    <>
      <th>ID</th>
      <th>Type</th>
      <th>Amount</th>
      <th>External ID</th>
      <th>Method &amp; Status</th>
      <th>Date</th>
    </>
  );

  const renderRow = (payment: AdminSubscriptionPaymentInfo, index: number) => (
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
      {/* Type */}
      <td className="align-top">
        <StatusBadge status={payment.payment_type === "purchase" ? "info" : "active"}>
          {payment.payment_type}
        </StatusBadge>
      </td>
      {/* Amount: total + rate / base / tax / fee */}
      <td className="align-top">
        <div className="min-w-0 max-w-[16rem]">
          <div className="font-medium text-slate-100">{formatCurrency(payment.amount, payment.currency)}</div>
          <div className="mt-0.5 space-y-0.5 font-mono text-xs text-slate-400">
            {payment.rate && payment.rate !== 1 && (
              <div>
                Rate:{" "}
                {new Intl.NumberFormat("en-US", {
                  style: payment.company_base_currency ? "currency" : "decimal",
                  currency: payment.company_base_currency ?? undefined,
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                }).format(payment.rate)}
              </div>
            )}
            {payment.rate && payment.currency !== payment.company_base_currency && (
              <div>
                Base: {formatBaseAmount(payment.amount, payment.currency, payment.rate, payment.company_base_currency)}
              </div>
            )}
            {payment.tax > 0 && <div>Tax: {formatCurrency(payment.tax, payment.currency)}</div>}
            {payment.processing_fee > 0 && <div>Fee: {formatCurrency(payment.processing_fee, payment.currency)}</div>}
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
          ) : payment.expires && new Date(payment.expires) < new Date() ? (
            <ClockIcon className="h-4 w-4 text-gray-400" />
          ) : (
            <XCircleIcon className="h-4 w-4 text-red-400" />
          )}
          <span
            className={
              payment.is_paid
                ? "text-green-400"
                : payment.expires && new Date(payment.expires) < new Date()
                  ? "text-gray-400"
                  : "text-red-400"
            }
          >
            {payment.is_paid
              ? "Paid"
              : payment.expires && new Date(payment.expires) < new Date()
                ? "Expired"
                : "Pending"}
          </span>
        </div>
        {!payment.is_paid && canCompletePayments && (
          <Button
            size="sm"
            variant="secondary"
            className="mt-1.5"
            disabled={completingId === payment.id}
            onClick={() => handleCompletePayment(payment)}
            title="Manually mark this payment as paid (extends subscription by 30 days)"
          >
            {completingId === payment.id ? "Completing..." : "Mark paid"}
          </Button>
        )}
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
    </tr>
  );

  const renderEmptyState = () => (
    <div className="text-center py-8">
      <BanknotesIcon className="mx-auto h-8 w-8 text-gray-600" />
      <p className="mt-2 text-sm text-gray-400">No payments recorded</p>
    </div>
  );

  return (
    <PaginatedTable
      apiCall={(params) => adminApi.getSubscriptionPayments(subscriptionId, params)}
      renderHeader={renderHeader}
      renderRow={renderRow}
      renderEmptyState={renderEmptyState}
      itemsPerPage={10}
      errorAction="load payments"
      loadingMessage="Loading payments..."
      minWidth="950px"
      inlineError={true}
      dependencies={[subscriptionId, refreshKey, localRefresh]}
      calculateStats={(payments, total) => (
        <div className="flex gap-4 text-sm text-gray-400">
          <span>
            Total: <span className="text-white font-medium">{total}</span>
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
  );
}

function CreateLineItemModal({
  subscriptionId,
  currency,
  onClose,
  onSuccess,
}: {
  subscriptionId: number;
  currency: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    amount: 0,
    setup_amount: 0,
    configuration: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // biome-ignore lint/suspicious/noExplicitAny: JSON configuration is dynamic
      let configuration: Record<string, any> | undefined;
      if (formData.configuration.trim()) {
        try {
          configuration = JSON.parse(formData.configuration);
        } catch {
          setError("Invalid JSON configuration");
          setSubmitting(false);
          return;
        }
      }

      await adminApi.createSubscriptionLineItem({
        subscription_id: subscriptionId,
        name: formData.name,
        description: formData.description || undefined,
        amount: Math.round(formData.amount * 100),
        setup_amount: Math.round(formData.setup_amount * 100),
        configuration,
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create line item");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Add Line Item" icon={PlusIcon}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Line item name"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Description (Optional)</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Recurring Amount ({currency})</label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Setup Amount ({currency})</label>
            <input
              type="number"
              step="0.01"
              value={formData.setup_amount}
              onChange={(e) => setFormData({ ...formData, setup_amount: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Configuration (Optional JSON)</label>
          <textarea
            value={formData.configuration}
            onChange={(e) => setFormData({ ...formData, configuration: e.target.value })}
            placeholder='{"service_type": "ip_range", "cidr": "192.168.1.0/24"}'
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 font-mono text-sm"
            rows={3}
          />
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-900 rounded-lg p-3 text-red-300 text-sm">{error}</div>
        )}

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting ? "Adding..." : "Add Line Item"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditLineItemModal({
  lineItem,
  currency,
  onClose,
  onSuccess,
}: {
  lineItem: AdminSubscriptionLineItemInfo;
  currency: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: lineItem.name,
    description: lineItem.description || "",
    amount: lineItem.amount / 100,
    setup_amount: lineItem.setup_amount / 100,
    configuration: lineItem.configuration ? JSON.stringify(lineItem.configuration, null, 2) : "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      let configuration: Record<string, any> | undefined;
      if (formData.configuration.trim()) {
        try {
          configuration = JSON.parse(formData.configuration);
        } catch {
          setError("Invalid JSON configuration");
          setSubmitting(false);
          return;
        }
      }

      await adminApi.updateSubscriptionLineItem(lineItem.id, {
        name: formData.name,
        description: formData.description || undefined,
        amount: Math.round(formData.amount * 100),
        setup_amount: Math.round(formData.setup_amount * 100),
        configuration,
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update line item");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit Line Item" icon={PencilIcon}>
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
            <label className="block text-sm font-medium text-gray-300 mb-1">Recurring Amount ({currency})</label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Setup Amount ({currency})</label>
            <input
              type="number"
              step="0.01"
              value={formData.setup_amount}
              onChange={(e) => setFormData({ ...formData, setup_amount: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Configuration (JSON)</label>
          <textarea
            value={formData.configuration}
            onChange={(e) => setFormData({ ...formData, configuration: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm"
            rows={3}
          />
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
