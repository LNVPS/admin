import {
  BoltIcon,
  CheckCircleIcon,
  CreditCardIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { PaginatedTable } from "../components/PaginatedTable";
import { useAdminApi } from "../hooks/useAdminApi";
import type {
  AdminCompanyInfo,
  AdminPaymentMethodConfigInfo,
  BitvoraProviderConfig,
  LndProviderConfig,
  PaypalProviderConfig,
  ProviderConfig,
  RevolutProviderConfig,
  SanitizedProviderConfig,
  StripeProviderConfig,
} from "../lib/api";
import { AdminPaymentMethod, PaymentProviderType } from "../lib/api";
import { CURRENCIES, formatCurrency, fromSmallestUnits, parseRate, toSmallestUnits } from "../utils/currency";

// Helper to get display name for payment method
function getPaymentMethodName(method: AdminPaymentMethod): string {
  const names: Record<AdminPaymentMethod, string> = {
    [AdminPaymentMethod.LIGHTNING]: "Lightning",
    [AdminPaymentMethod.REVOLUT]: "Revolut",
    [AdminPaymentMethod.PAYPAL]: "PayPal",
    [AdminPaymentMethod.STRIPE]: "Stripe",
  };
  return names[method] || method;
}

// Helper to get display name for provider type
function getProviderTypeName(type: PaymentProviderType): string {
  const names: Record<PaymentProviderType, string> = {
    [PaymentProviderType.LND]: "LND",
    [PaymentProviderType.BITVORA]: "Bitvora",
    [PaymentProviderType.REVOLUT]: "Revolut",
    [PaymentProviderType.STRIPE]: "Stripe",
    [PaymentProviderType.PAYPAL]: "PayPal",
  };
  return names[type] || type;
}

// Helper to get provider types for a payment method
function getProviderTypesForMethod(method: AdminPaymentMethod): PaymentProviderType[] {
  switch (method) {
    case AdminPaymentMethod.LIGHTNING:
      return [PaymentProviderType.LND]; // Bitvora is disabled
    case AdminPaymentMethod.REVOLUT:
      return [PaymentProviderType.REVOLUT];
    case AdminPaymentMethod.STRIPE:
      return [PaymentProviderType.STRIPE];
    case AdminPaymentMethod.PAYPAL:
      return [PaymentProviderType.PAYPAL];
    default:
      return [];
  }
}

// Helper to get icon color for payment method
function getPaymentMethodColor(method: AdminPaymentMethod): string {
  switch (method) {
    case AdminPaymentMethod.LIGHTNING:
      return "text-yellow-400";
    case AdminPaymentMethod.REVOLUT:
      return "text-blue-400";
    case AdminPaymentMethod.STRIPE:
      return "text-purple-400";
    case AdminPaymentMethod.PAYPAL:
      return "text-blue-500";
    default:
      return "text-gray-400";
  }
}

export function PaymentMethodsPage() {
  const adminApi = useAdminApi();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<AdminPaymentMethodConfigInfo | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [companies, setCompanies] = useState<AdminCompanyInfo[]>([]);

  // Load companies on mount for name lookup
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const response = await adminApi.getCompanies({ limit: 100 });
        setCompanies(response.data);
      } catch (error) {
        console.error("Failed to load companies:", error);
      }
    };
    loadCompanies();
  }, [adminApi]);

  // Create a lookup map for company names
  const companyNameMap = new Map(companies.map((c) => [c.id, c.name]));

  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleEdit = (config: AdminPaymentMethodConfigInfo) => {
    setSelectedConfig(config);
    setShowEditModal(true);
  };

  const handleDelete = async (config: AdminPaymentMethodConfigInfo) => {
    if (confirm(`Are you sure you want to delete payment method "${config.name}"?`)) {
      try {
        await adminApi.deletePaymentMethodConfig(config.id);
        refreshData();
      } catch (error) {
        console.error("Failed to delete payment method config:", error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const renderHeader = () => (
    <>
      <th className="w-16">ID</th>
      <th>Name</th>
      <th>Company</th>
      <th>Payment Method</th>
      <th>Processing Fee</th>
      <th>Status</th>
      <th>Created</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (config: AdminPaymentMethodConfigInfo, index: number) => (
    <tr key={config.id || index}>
      <td className="whitespace-nowrap text-white">{config.id}</td>
      <td>
        <div className="font-medium text-white">{config.name}</div>
      </td>
      <td className="text-gray-300">
        <div className="text-sm">
          {config.company_name || companyNameMap.get(config.company_id) || `Company #${config.company_id}`}
        </div>
      </td>
      <td>
        <div className="flex items-center gap-2">
          {config.payment_method === AdminPaymentMethod.LIGHTNING ? (
            <BoltIcon className={`h-5 w-5 ${getPaymentMethodColor(config.payment_method)}`} />
          ) : (
            <CreditCardIcon className={`h-5 w-5 ${getPaymentMethodColor(config.payment_method)}`} />
          )}
          <span className="text-gray-300">{getPaymentMethodName(config.payment_method)}</span>
          {getProviderTypesForMethod(config.payment_method).length > 1 && (
            <span className="px-2 py-1 bg-slate-700 rounded text-xs font-mono">
              {getProviderTypeName(config.provider_type)}
            </span>
          )}
        </div>
      </td>
      <td className="text-gray-300">
        {config.processing_fee_rate !== null || config.processing_fee_base !== null ? (
          <div className="text-sm">
            {config.processing_fee_rate !== null && <span>{config.processing_fee_rate}%</span>}
            {config.processing_fee_rate !== null && config.processing_fee_base !== null && " + "}
            {config.processing_fee_base !== null && config.processing_fee_currency && (
              <span>{formatCurrency(config.processing_fee_base, config.processing_fee_currency)}</span>
            )}
            {config.processing_fee_base !== null && !config.processing_fee_currency && (
              <span>{config.processing_fee_base}</span>
            )}
          </div>
        ) : (
          <span className="text-gray-500">None</span>
        )}
      </td>
      <td>
        {config.enabled ? (
          <div className="flex items-center text-green-400">
            <CheckCircleIcon className="h-5 w-5 mr-1" />
            <span>Enabled</span>
          </div>
        ) : (
          <div className="flex items-center text-red-400">
            <XCircleIcon className="h-5 w-5 mr-1" />
            <span>Disabled</span>
          </div>
        )}
      </td>
      <td className="text-gray-300">{formatDate(config.created)}</td>
      <td className="text-right">
        <div className="flex justify-end space-x-2">
          <Button size="sm" variant="secondary" onClick={() => handleEdit(config)} className="p-1">
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleDelete(config)}
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
      <CreditCardIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>No payment method configurations found</p>
    </div>
  );

  const calculateStats = (configs: AdminPaymentMethodConfigInfo[], totalItems: number) => {
    const stats = {
      total: totalItems,
      enabled: configs.filter((c) => c.enabled).length,
      lightning: configs.filter((c) => c.payment_method === AdminPaymentMethod.LIGHTNING).length,
      fiat: configs.filter((c) => c.payment_method !== AdminPaymentMethod.LIGHTNING).length,
    };

    return (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Payment Methods</h1>
          <div className="mt-2 flex gap-4 text-sm text-gray-400">
            <span>
              Total: <span className="text-white font-medium">{stats.total}</span>
            </span>
            <span>
              Enabled: <span className="text-green-400 font-medium">{stats.enabled}</span>
            </span>
            <span>
              Lightning: <span className="text-yellow-400 font-medium">{stats.lightning}</span>
            </span>
            <span>
              Fiat: <span className="text-blue-400 font-medium">{stats.fiat}</span>
            </span>
          </div>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Payment Method
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PaginatedTable
        apiCall={(params) => adminApi.getPaymentMethodConfigs(params)}
        renderHeader={renderHeader}
        renderRow={renderRow}
        renderEmptyState={renderEmptyState}
        calculateStats={calculateStats}
        itemsPerPage={20}
        errorAction="view payment methods"
        loadingMessage="Loading payment methods..."
        dependencies={[refreshTrigger]}
        minWidth="1400px"
      />

      {/* Create Payment Method Modal */}
      <CreatePaymentMethodModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={refreshData}
      />

      {/* Edit Payment Method Modal */}
      {selectedConfig && (
        <EditPaymentMethodModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedConfig(null);
          }}
          config={selectedConfig}
          onSuccess={refreshData}
        />
      )}
    </div>
  );
}

// Secret fields by provider type - these are sanitized in API responses
const SECRET_FIELDS: Record<PaymentProviderType, string[]> = {
  [PaymentProviderType.LND]: ["macaroon_path"],
  [PaymentProviderType.BITVORA]: ["token", "webhook_secret"],
  [PaymentProviderType.REVOLUT]: ["token", "webhook_secret"],
  [PaymentProviderType.STRIPE]: ["secret_key", "webhook_secret"],
  [PaymentProviderType.PAYPAL]: ["client_secret"],
};

// Maps secret field names to their "has_*" boolean indicator in sanitized config
const SECRET_FIELD_INDICATORS: Record<string, string> = {
  macaroon_path: "has_macaroon",
  token: "has_token",
  webhook_secret: "has_webhook_secret",
  secret_key: "has_secret_key",
  client_secret: "has_client_secret",
};

// Provider Config Form Component
function ProviderConfigForm({
  providerType,
  config,
  onChange,
  isEditing = false,
  sanitizedConfig,
  modifiedFields,
  onFieldModified,
}: {
  providerType: PaymentProviderType;
  config: ProviderConfig | null;
  onChange: (config: ProviderConfig | null) => void;
  isEditing?: boolean;
  sanitizedConfig?: SanitizedProviderConfig | null;
  modifiedFields?: Set<string>;
  onFieldModified?: (field: string) => void;
}) {
  const getInitialConfig = (): ProviderConfig => {
    switch (providerType) {
      case PaymentProviderType.LND:
        return { type: "lnd", url: "", cert_path: null };
      case PaymentProviderType.BITVORA:
        return { type: "bitvora" };
      case PaymentProviderType.REVOLUT:
        return { type: "revolut", url: "", api_version: null, public_key: null };
      case PaymentProviderType.STRIPE:
        return { type: "stripe", publishable_key: null };
      case PaymentProviderType.PAYPAL:
        return { type: "paypal", client_id: "", mode: "sandbox" };
    }
  };

  const currentConfig = config || getInitialConfig();
  const secretFields = SECRET_FIELDS[providerType] || [];

  const updateField = (field: string, value: string | null) => {
    // Track modified secret fields when editing
    if (isEditing && secretFields.includes(field) && onFieldModified) {
      onFieldModified(field);
    }
    onChange({ ...currentConfig, [field]: value || null } as ProviderConfig);
  };

  // Check if a secret field is set in the sanitized config (via boolean indicator)
  const isSecretSet = (field: string): boolean => {
    if (!sanitizedConfig) return false;
    const indicator = SECRET_FIELD_INDICATORS[field];
    if (!indicator) return false;
    return (sanitizedConfig as Record<string, unknown>)[indicator] === true;
  };

  // Helper to determine if a secret field should show placeholder
  const getSecretFieldProps = (field: string, currentValue: string | undefined) => {
    const isSecret = secretFields.includes(field);
    const isModified = modifiedFields?.has(field);

    if (isEditing && isSecret && !isModified) {
      // Show placeholder for unmodified secret fields when editing
      return {
        value: "",
        placeholder: isSecretSet(field) ? "••••••••" : "Not set",
      };
    }
    return {
      value: currentValue || "",
      placeholder: undefined,
    };
  };

  // Helper text for secret fields when editing
  const SecretFieldHint = ({ field }: { field: string }) => {
    if (!isEditing || !secretFields.includes(field)) return null;
    const isModified = modifiedFields?.has(field);
    return (
      <p className="text-xs text-gray-500 mt-1">
        {isModified ? "Will be updated" : "Leave empty to keep existing value"}
      </p>
    );
  };

  switch (providerType) {
    case PaymentProviderType.LND: {
      const lndConfig = currentConfig as LndProviderConfig;
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">LND URL *</label>
            <input
              type="text"
              value={lndConfig.url || ""}
              onChange={(e) => updateField("url", e.target.value)}
              className=""
              placeholder="https://localhost:8080"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-white mb-2">Certificate Path</label>
              <input
                type="text"
                value={lndConfig.cert_path || ""}
                onChange={(e) => updateField("cert_path", e.target.value)}
                className=""
                placeholder="/path/to/tls.cert"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white mb-2">Macaroon Path</label>
              <input
                type="text"
                {...getSecretFieldProps("macaroon_path", lndConfig.macaroon_path)}
                onChange={(e) => updateField("macaroon_path", e.target.value)}
                className=""
              />
              <SecretFieldHint field="macaroon_path" />
            </div>
          </div>
        </div>
      );
    }

    case PaymentProviderType.BITVORA: {
      const bitvoraConfig = currentConfig as BitvoraProviderConfig;
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">API Token *</label>
            <input
              type="password"
              {...getSecretFieldProps("token", bitvoraConfig.token)}
              onChange={(e) => updateField("token", e.target.value)}
              className=""
              required={!isEditing}
            />
            <SecretFieldHint field="token" />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Webhook Secret</label>
            <input
              type="password"
              {...getSecretFieldProps("webhook_secret", bitvoraConfig.webhook_secret)}
              onChange={(e) => updateField("webhook_secret", e.target.value)}
              className=""
            />
            <SecretFieldHint field="webhook_secret" />
          </div>
        </div>
      );
    }

    case PaymentProviderType.REVOLUT: {
      const revolutConfig = currentConfig as RevolutProviderConfig;
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-white mb-2">API URL *</label>
              <input
                type="text"
                value={revolutConfig.url || ""}
                onChange={(e) => updateField("url", e.target.value)}
                className=""
                placeholder="https://merchant.revolut.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white mb-2">API Version</label>
              <input
                type="text"
                value={revolutConfig.api_version || ""}
                onChange={(e) => updateField("api_version", e.target.value)}
                className=""
                placeholder="2024-09-01"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">API Token *</label>
            <input
              type="password"
              {...getSecretFieldProps("token", revolutConfig.token)}
              onChange={(e) => updateField("token", e.target.value)}
              className=""
              required={!isEditing}
            />
            <SecretFieldHint field="token" />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Public Key</label>
            <textarea
              value={revolutConfig.public_key || ""}
              onChange={(e) => updateField("public_key", e.target.value)}
              className=""
              rows={3}
              placeholder="Public key for webhook verification"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Webhook Secret</label>
            <input
              type="password"
              {...getSecretFieldProps("webhook_secret", revolutConfig.webhook_secret)}
              onChange={(e) => updateField("webhook_secret", e.target.value)}
              className=""
            />
            <SecretFieldHint field="webhook_secret" />
          </div>
        </div>
      );
    }

    case PaymentProviderType.STRIPE: {
      const stripeConfig = currentConfig as StripeProviderConfig;
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">Secret Key *</label>
            <input
              type="password"
              {...getSecretFieldProps("secret_key", stripeConfig.secret_key)}
              onChange={(e) => updateField("secret_key", e.target.value)}
              className=""
              required={!isEditing}
            />
            <SecretFieldHint field="secret_key" />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Publishable Key</label>
            <input
              type="text"
              value={stripeConfig.publishable_key || ""}
              onChange={(e) => updateField("publishable_key", e.target.value)}
              className=""
              placeholder="pk_live_..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Webhook Secret</label>
            <input
              type="password"
              {...getSecretFieldProps("webhook_secret", stripeConfig.webhook_secret)}
              onChange={(e) => updateField("webhook_secret", e.target.value)}
              className=""
            />
            <SecretFieldHint field="webhook_secret" />
          </div>
        </div>
      );
    }

    case PaymentProviderType.PAYPAL: {
      const paypalConfig = currentConfig as PaypalProviderConfig;
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">Client ID *</label>
            <input
              type="text"
              value={paypalConfig.client_id || ""}
              onChange={(e) => updateField("client_id", e.target.value)}
              className=""
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Client Secret *</label>
            <input
              type="password"
              {...getSecretFieldProps("client_secret", paypalConfig.client_secret)}
              onChange={(e) => updateField("client_secret", e.target.value)}
              className=""
              required={!isEditing}
            />
            <SecretFieldHint field="client_secret" />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Mode</label>
            <select
              value={paypalConfig.mode || "sandbox"}
              onChange={(e) => updateField("mode", e.target.value)}
              className=""
            >
              <option value="sandbox">Sandbox</option>
              <option value="live">Live</option>
            </select>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}

// Create Payment Method Modal Component
function CreatePaymentMethodModal({
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
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<AdminCompanyInfo[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    company_id: 0,
    payment_method: AdminPaymentMethod.LIGHTNING,
    provider_type: PaymentProviderType.LND,
    enabled: true,
    processing_fee_rate: "",
    processing_fee_base: "",
    processing_fee_currency: "",
  });
  const [providerConfig, setProviderConfig] = useState<ProviderConfig | null>(null);

  // Load companies on mount
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const response = await adminApi.getCompanies({ limit: 100 });
        setCompanies(response.data);
        if (response.data.length > 0) {
          setFormData((prev) => ({ ...prev, company_id: response.data[0].id }));
        }
      } catch (error) {
        console.error("Failed to load companies:", error);
      } finally {
        setLoadingCompanies(false);
      }
    };
    if (isOpen) {
      loadCompanies();
    }
  }, [isOpen, adminApi]);

  // Update provider type when payment method changes
  const handlePaymentMethodChange = (method: AdminPaymentMethod) => {
    const availableProviders = getProviderTypesForMethod(method);
    setFormData({
      ...formData,
      payment_method: method,
      provider_type: availableProviders[0],
    });
    setProviderConfig(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Convert base fee from human-readable to smallest units if currency is set
      const baseFee = parseRate(formData.processing_fee_base);
      const baseFeeInSmallestUnits =
        baseFee !== null && formData.processing_fee_currency
          ? toSmallestUnits(baseFee, formData.processing_fee_currency)
          : null;

      const data = {
        name: formData.name,
        company_id: formData.company_id,
        payment_method: formData.payment_method,
        provider_type: formData.provider_type,
        enabled: formData.enabled,
        config: providerConfig,
        processing_fee_rate: parseRate(formData.processing_fee_rate),
        processing_fee_base: baseFeeInSmallestUnits,
        processing_fee_currency: formData.processing_fee_currency || null,
      };

      await adminApi.createPaymentMethodConfig(data);
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        name: "",
        company_id: companies[0]?.id || 0,
        payment_method: AdminPaymentMethod.LIGHTNING,
        provider_type: PaymentProviderType.LND,
        enabled: true,
        processing_fee_rate: "",
        processing_fee_base: "",
        processing_fee_currency: "",
      });
      setProviderConfig(null);
    } catch (err) {
      console.error("Failed to create payment method config:", err);
      setError(err instanceof Error ? err.message : "Failed to create payment method config");
    } finally {
      setLoading(false);
    }
  };

  const availableProviders = getProviderTypesForMethod(formData.payment_method);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Payment Method" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-3 py-2 rounded text-sm">{error}</div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className=""
              placeholder="e.g., Production Lightning"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Company *</label>
            <select
              value={formData.company_id}
              onChange={(e) => setFormData({ ...formData, company_id: parseInt(e.target.value) })}
              className=""
              required
              disabled={loadingCompanies}
            >
              {loadingCompanies ? (
                <option>Loading...</option>
              ) : (
                companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">Payment Method *</label>
            <select
              value={formData.payment_method}
              onChange={(e) => handlePaymentMethodChange(e.target.value as AdminPaymentMethod)}
              className=""
              required
            >
              {Object.values(AdminPaymentMethod).map((method) => (
                <option key={method} value={method}>
                  {getPaymentMethodName(method)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Provider Type *</label>
            <select
              value={formData.provider_type}
              onChange={(e) => {
                setFormData({ ...formData, provider_type: e.target.value as PaymentProviderType });
                setProviderConfig(null);
              }}
              className=""
              required
            >
              {availableProviders.map((provider) => (
                <option key={provider} value={provider}>
                  {getProviderTypeName(provider)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="enabled"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="enabled" className="text-sm text-white">
            Enabled
          </label>
        </div>

        {/* Provider-specific config */}
        <div className="border-t border-slate-700 pt-4">
          <h3 className="text-sm font-medium text-white mb-4">Provider Configuration</h3>
          <ProviderConfigForm
            providerType={formData.provider_type}
            config={providerConfig}
            onChange={setProviderConfig}
          />
        </div>

        {/* Processing Fee */}
        <div className="border-t border-slate-700 pt-4">
          <h3 className="text-sm font-medium text-white mb-4">Processing Fee (Optional)</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-white mb-2">Rate (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.processing_fee_rate}
                onChange={(e) => setFormData({ ...formData, processing_fee_rate: e.target.value })}
                className=""
                placeholder="1.5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white mb-2">
                Base Fee
                {formData.processing_fee_currency &&
                  ` (${formData.processing_fee_currency === "BTC" ? "sats" : formData.processing_fee_currency})`}
              </label>
              <input
                type="number"
                step={formData.processing_fee_currency === "BTC" ? "1" : "0.01"}
                min="0"
                value={formData.processing_fee_base}
                onChange={(e) => setFormData({ ...formData, processing_fee_base: e.target.value })}
                className=""
                placeholder={formData.processing_fee_currency === "BTC" ? "1000" : "0.20"}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.processing_fee_currency === "BTC" ? "e.g., 1000 for 1000 sats" : "e.g., 0.20 for €0.20"}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-white mb-2">Currency</label>
              <select
                value={formData.processing_fee_currency}
                onChange={(e) => setFormData({ ...formData, processing_fee_currency: e.target.value })}
                className=""
              >
                <option value="">Select currency</option>
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || loadingCompanies}>
            {loading ? "Creating..." : "Create Payment Method"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Edit Payment Method Modal Component
function EditPaymentMethodModal({
  isOpen,
  onClose,
  config,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  config: AdminPaymentMethodConfigInfo;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<AdminCompanyInfo[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  // Convert processing_fee_base from smallest units to human-readable for display
  const getInitialBaseFee = (): string => {
    if (config.processing_fee_base === null) return "";
    if (!config.processing_fee_currency) return config.processing_fee_base.toString();
    return fromSmallestUnits(config.processing_fee_base, config.processing_fee_currency).toString();
  };

  const [formData, setFormData] = useState({
    name: config.name,
    company_id: config.company_id,
    payment_method: config.payment_method,
    provider_type: config.provider_type,
    enabled: config.enabled,
    processing_fee_rate: config.processing_fee_rate?.toString() || "",
    processing_fee_base: getInitialBaseFee(),
    processing_fee_currency: config.processing_fee_currency || "",
  });

  // Initialize provider config with non-secret fields from sanitized config
  const getInitialProviderConfig = (): ProviderConfig | null => {
    if (!config.config) return null;
    const sanitized = config.config;

    switch (sanitized.type) {
      case "lnd":
        return { type: "lnd", url: sanitized.url, cert_path: sanitized.cert_path };
      case "bitvora":
        return { type: "bitvora" };
      case "revolut":
        return {
          type: "revolut",
          url: sanitized.url,
          api_version: sanitized.api_version,
          public_key: sanitized.public_key,
        };
      case "stripe":
        return { type: "stripe", publishable_key: sanitized.publishable_key };
      case "paypal":
        return { type: "paypal", client_id: sanitized.client_id, mode: sanitized.mode };
      default:
        return null;
    }
  };

  const [providerConfig, setProviderConfig] = useState<ProviderConfig | null>(getInitialProviderConfig);
  const [modifiedSecretFields, setModifiedSecretFields] = useState<Set<string>>(new Set());

  // Track when a secret field is modified
  const handleSecretFieldModified = (field: string) => {
    setModifiedSecretFields((prev) => new Set(prev).add(field));
  };

  // Load companies on mount
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const response = await adminApi.getCompanies({ limit: 100 });
        setCompanies(response.data);
      } catch (error) {
        console.error("Failed to load companies:", error);
      } finally {
        setLoadingCompanies(false);
      }
    };
    if (isOpen) {
      loadCompanies();
    }
  }, [isOpen, adminApi]);

  // Update provider type when payment method changes
  const handlePaymentMethodChange = (method: AdminPaymentMethod) => {
    const availableProviders = getProviderTypesForMethod(method);
    setFormData({
      ...formData,
      payment_method: method,
      provider_type: availableProviders[0],
    });
    setProviderConfig(null);
    setModifiedSecretFields(new Set()); // Reset modified fields when changing provider
  };

  // Strip unmodified secret fields from config before submitting
  const getConfigForSubmit = (): ProviderConfig | null => {
    if (!providerConfig) return null;

    const secretFields = SECRET_FIELDS[formData.provider_type] || [];
    const result = { ...providerConfig };

    for (const field of secretFields) {
      if (!modifiedSecretFields.has(field)) {
        // Remove unmodified secret fields - API will preserve existing values
        delete (result as Record<string, unknown>)[field];
      }
    }

    return result as ProviderConfig;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Convert base fee from human-readable to smallest units if currency is set
      const baseFee = parseRate(formData.processing_fee_base);
      const baseFeeInSmallestUnits =
        baseFee !== null && formData.processing_fee_currency
          ? toSmallestUnits(baseFee, formData.processing_fee_currency)
          : null;

      const updates = {
        name: formData.name,
        company_id: formData.company_id,
        payment_method: formData.payment_method,
        provider_type: formData.provider_type,
        enabled: formData.enabled,
        config: getConfigForSubmit(),
        processing_fee_rate: parseRate(formData.processing_fee_rate),
        processing_fee_base: baseFeeInSmallestUnits,
        processing_fee_currency: formData.processing_fee_currency || null,
      };

      await adminApi.updatePaymentMethodConfig(config.id, updates);
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to update payment method config:", err);
      setError(err instanceof Error ? err.message : "Failed to update payment method config");
    } finally {
      setLoading(false);
    }
  };

  const availableProviders = getProviderTypesForMethod(formData.payment_method);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Payment Method" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-3 py-2 rounded text-sm">{error}</div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className=""
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Company *</label>
            <select
              value={formData.company_id}
              onChange={(e) => setFormData({ ...formData, company_id: parseInt(e.target.value) })}
              className=""
              required
              disabled={loadingCompanies}
            >
              {loadingCompanies ? (
                <option>Loading...</option>
              ) : (
                companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">Payment Method *</label>
            <select
              value={formData.payment_method}
              onChange={(e) => handlePaymentMethodChange(e.target.value as AdminPaymentMethod)}
              className=""
              required
            >
              {Object.values(AdminPaymentMethod).map((method) => (
                <option key={method} value={method}>
                  {getPaymentMethodName(method)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Provider Type *</label>
            <select
              value={formData.provider_type}
              onChange={(e) => {
                setFormData({ ...formData, provider_type: e.target.value as PaymentProviderType });
                setProviderConfig(null);
              }}
              className=""
              required
            >
              {availableProviders.map((provider) => (
                <option key={provider} value={provider}>
                  {getProviderTypeName(provider)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="enabled-edit"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="enabled-edit" className="text-sm text-white">
            Enabled
          </label>
        </div>

        {/* Provider-specific config */}
        <div className="border-t border-slate-700 pt-4">
          <h3 className="text-sm font-medium text-white mb-4">Provider Configuration</h3>
          <ProviderConfigForm
            providerType={formData.provider_type}
            config={providerConfig}
            onChange={setProviderConfig}
            isEditing={true}
            sanitizedConfig={config.config}
            modifiedFields={modifiedSecretFields}
            onFieldModified={handleSecretFieldModified}
          />
        </div>

        {/* Processing Fee */}
        <div className="border-t border-slate-700 pt-4">
          <h3 className="text-sm font-medium text-white mb-4">Processing Fee (Optional)</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-white mb-2">Rate (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.processing_fee_rate}
                onChange={(e) => setFormData({ ...formData, processing_fee_rate: e.target.value })}
                className=""
                placeholder="1.5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white mb-2">
                Base Fee
                {formData.processing_fee_currency &&
                  ` (${formData.processing_fee_currency === "BTC" ? "sats" : formData.processing_fee_currency})`}
              </label>
              <input
                type="number"
                step={formData.processing_fee_currency === "BTC" ? "1" : "0.01"}
                min="0"
                value={formData.processing_fee_base}
                onChange={(e) => setFormData({ ...formData, processing_fee_base: e.target.value })}
                className=""
                placeholder={formData.processing_fee_currency === "BTC" ? "1000" : "0.20"}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.processing_fee_currency === "BTC" ? "e.g., 1000 for 1000 sats" : "e.g., 0.20 for €0.20"}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-white mb-2">Currency</label>
              <select
                value={formData.processing_fee_currency}
                onChange={(e) => setFormData({ ...formData, processing_fee_currency: e.target.value })}
                className=""
              >
                <option value="">Select currency</option>
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || loadingCompanies}>
            {loading ? "Updating..." : "Update Payment Method"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
