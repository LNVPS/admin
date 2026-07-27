import { CubeIcon, PencilIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../components/Button";
import { countActiveFilters, FilterBar, FilterButton, type FilterField } from "../components/FilterBar";
import { IntervalInput } from "../components/IntervalInput";
import { Modal } from "../components/Modal";
import { MoneyAmountInput, MoneyInput } from "../components/MoneyInput";
import { PaginatedTable } from "../components/PaginatedTable";
import { StatsHeader } from "../components/StatsHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useAdminApi } from "../hooks/useAdminApi";
import { useToast } from "../hooks/useToast";
import type { AdminAppClusterInfo, AdminAppInfo, AdminCustomPricingInfo, AppIntervalType } from "../lib/api";
import { parseComposeFootprint } from "../lib/composeSchema";
import { confirmDialog } from "../services/confirmService";
import { suggestAppPriceRange } from "../utils/appPricing";
import { formatCurrency } from "../utils/currency";
import { formatBytes } from "../utils/formatBytes";

function formatInterval(amount: number, type: AppIntervalType): string {
  if (amount === 1) return `per ${type}`;
  return `every ${amount} ${type}s`;
}

function formatFootprint(app: AdminAppInfo): string {
  const parts: string[] = [];
  if (app.cpu_milli != null) parts.push(`${app.cpu_milli / 1000} CPU`);
  if (app.memory_bytes != null) parts.push(formatBytes(app.memory_bytes));
  if (app.storage_bytes != null) parts.push(`${formatBytes(app.storage_bytes)} disk`);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export function AppsPage() {
  const adminApi = useAdminApi();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selected, setSelected] = useState<AdminAppInfo | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [enabledFilter, setEnabledFilter] = useState("");
  const { success, error: toastError } = useToast();

  const refreshData = () => setRefreshTrigger((prev) => prev + 1);

  const filterFields: FilterField[] = [
    {
      kind: "text",
      key: "app-search",
      label: "Search",
      value: searchFilter,
      placeholder: "Name, display name or description",
      onChange: setSearchFilter,
      colSpan: 2,
    },
    {
      kind: "select",
      key: "app-enabled",
      label: "Catalog state",
      value: enabledFilter,
      onChange: setEnabledFilter,
      options: [
        { value: "", label: "Enabled and disabled" },
        { value: "true", label: "Enabled only" },
        { value: "false", label: "Disabled only" },
      ],
    },
  ];

  const clearFilters = () => {
    setSearchFilter("");
    setEnabledFilter("");
  };

  // Blanks are omitted rather than sent: the API rejects an empty value for a
  // typed filter, and an empty `search` would be a no-op round trip anyway.
  const fetchApps = useCallback(
    (params: { limit: number; offset: number }) =>
      adminApi.getApps({
        ...params,
        search: searchFilter.trim() || undefined,
        enabled: enabledFilter === "" ? undefined : enabledFilter === "true",
      }),
    [adminApi, searchFilter, enabledFilter],
  );

  const handleEdit = (app: AdminAppInfo) => {
    setSelected(app);
    setShowEditModal(true);
  };

  const handleDelete = async (app: AdminAppInfo) => {
    if (
      !(await confirmDialog({
        title: "Delete App",
        message: `Are you sure you want to delete "${app.display_name}"? This is rejected while the app still has deployments — disable it instead.`,
      }))
    )
      return;
    try {
      await adminApi.deleteApp(app.id);
      success("App deleted");
      refreshData();
    } catch (err) {
      console.error("Failed to delete app:", err);
      toastError(err instanceof Error ? err.message : "Failed to delete app");
    }
  };

  const renderHeader = () => (
    <>
      <th className="w-16">ID</th>
      <th>Name</th>
      <th>Slug</th>
      <th>Category</th>
      <th>Pricing</th>
      <th>Footprint</th>
      <th>Status</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (app: AdminAppInfo, index: number) => (
    <tr key={app.id || index}>
      <td className="whitespace-nowrap align-top text-white">{app.id}</td>
      <td className="align-top">
        <div className="flex items-center gap-2">
          {app.icon ? (
            <img src={app.icon} alt="" className="h-6 w-6 rounded object-cover" />
          ) : (
            <CubeIcon className="h-6 w-6 text-slate-500" />
          )}
          <div className="min-w-0">
            <div className="truncate font-medium text-white" title={app.display_name}>
              {app.display_name}
            </div>
            {app.description && (
              <div className="truncate text-xs text-slate-400 max-w-[16rem]" title={app.description}>
                {app.description}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="align-top">
        <span className="font-mono text-xs text-gray-400">{app.name}</span>
        {app.repo_url && (
          <a
            href={app.repo_url}
            target="_blank"
            rel="noreferrer"
            className="block truncate max-w-[12rem] text-xs text-blue-400 hover:underline"
            title={app.repo_url}
            onClick={(e) => e.stopPropagation()}
          >
            repo ↗
          </a>
        )}
      </td>
      <td className="align-top">
        {app.category === MIGRATION_PLACEHOLDER_CATEGORY ? (
          <span
            className="text-xs text-amber-400"
            title="Placeholder written by the migration, not reviewed copy. It renders verbatim in the public page title until it is set."
          >
            {app.category} ⚠
          </span>
        ) : (
          <span className="text-xs text-gray-300">{app.category}</span>
        )}
      </td>
      <td className="align-top text-gray-300">
        <div className="text-white">{formatCurrency(app.amount, app.currency)}</div>
        <div className="text-xs text-slate-400">{formatInterval(app.interval_amount, app.interval_type)}</div>
        {app.setup_amount > 0 && (
          <div className="text-xs text-slate-400">{formatCurrency(app.setup_amount, app.currency)} setup</div>
        )}
      </td>
      <td className="align-top text-xs text-gray-400">{formatFootprint(app)}</td>
      <td className="align-top">
        <StatusBadge status={app.enabled ? "active" : "inactive"} />
      </td>
      <td className="text-right align-top">
        <div className="flex justify-end space-x-2">
          <Button size="sm" variant="secondary" onClick={() => handleEdit(app)} className="p-1">
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleDelete(app)}
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
      <CubeIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
      {/* An empty filtered page is not an empty catalog — say which one it is. */}
      <p>{countActiveFilters(filterFields) > 0 ? "No apps match these filters" : "No apps configured"}</p>
    </div>
  );

  const calculateStats = (apps: AdminAppInfo[], totalItems: number) => (
    <StatsHeader
      title="App Catalog"
      stats={[
        { label: "Total", value: totalItems },
        { label: "Enabled", value: apps.filter((a) => a.enabled).length, tone: "success" },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <FilterButton
            open={showFilters}
            activeCount={countActiveFilters(filterFields)}
            onClick={() => setShowFilters((prev) => !prev)}
          />
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add App
          </Button>
        </div>
      }
    />
  );

  return (
    <div className="space-y-6">
      <PaginatedTable
        apiCall={fetchApps}
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
        errorAction="view apps"
        loadingMessage="Loading apps..."
        dependencies={[refreshTrigger, searchFilter, enabledFilter]}
        minWidth="1000px"
      />

      <AppModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSuccess={refreshData} />

      {selected && (
        <AppModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelected(null);
          }}
          app={selected}
          onSuccess={refreshData}
        />
      )}
    </div>
  );
}

const DEFAULT_COMPOSE =
  "services:\n  app:\n    image: example/app:latest\n    ports:\n      - { name: web, container: 80, protocol: http, expose: ingress }\n";

/**
 * The value `20260726110000_app_seo_metadata.sql` writes as a safety net for any
 * app it could not backfill by slug. Its own comment calls it "a placeholder,
 * not reviewed copy" — it renders verbatim in the public page title until an
 * admin sets a real one, so flag it in the listing rather than let it blend in.
 */
const MIGRATION_PLACEHOLDER_CATEGORY = "Self-hosted application";

function AppModal({
  isOpen,
  onClose,
  app,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  app?: AdminAppInfo;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const { success, error: toastError } = useToast();
  const isEdit = !!app;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: app?.name ?? "",
    display_name: app?.display_name ?? "",
    description: app?.description ?? "",
    icon: app?.icon ?? "",
    repo_url: app?.repo_url ?? "",
    category: app?.category ?? "",
    seo_title: app?.seo_title ?? "",
    seo_description: app?.seo_description ?? "",
    compose: app?.compose ?? DEFAULT_COMPOSE,
    amount: app?.amount ?? 0,
    currency: app?.currency ?? "USD",
    interval_amount: app?.interval_amount ?? 1,
    interval_type: (app?.interval_type ?? "month") as AppIntervalType,
    setup_amount: app?.setup_amount ?? 0,
    enabled: app?.enabled ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isEdit && app) {
        await adminApi.updateApp(app.id, {
          name: formData.name,
          display_name: formData.display_name,
          description: formData.description || null,
          icon: formData.icon || null,
          repo_url: formData.repo_url || null,
          // Trimmed because the API rejects whitespace-only as blank, and a
          // stored leading space would show up in the public <title>.
          category: formData.category.trim(),
          seo_title: formData.seo_title.trim() || null,
          seo_description: formData.seo_description.trim() || null,
          compose: formData.compose,
          amount: formData.amount,
          currency: formData.currency,
          interval_amount: formData.interval_amount,
          interval_type: formData.interval_type,
          setup_amount: formData.setup_amount,
          enabled: formData.enabled,
        });
        success("App updated");
      } else {
        await adminApi.createApp({
          name: formData.name,
          display_name: formData.display_name,
          description: formData.description || undefined,
          icon: formData.icon || undefined,
          repo_url: formData.repo_url || undefined,
          category: formData.category.trim(),
          seo_title: formData.seo_title.trim() || undefined,
          seo_description: formData.seo_description.trim() || undefined,
          compose: formData.compose,
          amount: formData.amount,
          currency: formData.currency,
          interval_amount: formData.interval_amount,
          interval_type: formData.interval_type,
          setup_amount: formData.setup_amount,
          enabled: formData.enabled,
        });
        success("App created");
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to save app:", err);
      const msg = err instanceof Error ? err.message : "Failed to save app";
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? "Edit App" : "Create App"} size="3xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-3 py-2 rounded text-sm">{error}</div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">Slug *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="font-mono"
              placeholder="nostr-relay"
              pattern="[a-z0-9\-]+"
              title="Lowercase letters, digits and hyphens only"
              required
            />
            <p className="text-xs text-gray-500 mt-1">DNS-safe slug, unique.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Display Name *</label>
            <input
              type="text"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              className=""
              placeholder="Nostr Relay"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">Description</label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className=""
            placeholder="A personal Nostr relay"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">Category *</label>
          <input
            type="text"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className=""
            placeholder="Nostr relay"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Sentence case with proper nouns capitalised. No article, no "hosting", no "managed", no trailing punctuation
            — the public page wraps it as{" "}
            <span className="font-mono text-gray-400">
              {formData.display_name || "App"} Hosting — Managed {formData.category.trim() || "…"}
            </span>
            . Good: <span className="font-mono text-gray-400">Nostr relay</span>,{" "}
            <span className="font-mono text-gray-400">Community Nostr relay</span>. Bad:{" "}
            <span className="font-mono text-gray-400">A managed Nostr relay hosting.</span>
          </p>
        </div>

        <details className="rounded border border-slate-700 px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium text-white">SEO overrides (optional)</summary>
          <p className="text-xs text-gray-500 mt-2">
            Leave blank unless the generated copy is wrong for this app. Both are English only — they bypass the site's
            translations, so every locale gets what you type here.
          </p>
          <div className="mt-3 space-y-4">
            <div>
              <label className="block text-xs font-medium text-white mb-2">Title override</label>
              <input
                type="text"
                value={formData.seo_title}
                onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
                className=""
                placeholder="Managed Nostr Relay Hosting"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white mb-2">Description override</label>
              <input
                type="text"
                value={formData.seo_description}
                onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
                className=""
                placeholder="Run your own Nostr relay on LNVPS — up in minutes, TLS included."
              />
            </div>
          </div>
        </details>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">Icon URL</label>
            <input
              type="text"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              className="font-mono"
              placeholder="https://.../icon.png"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-2">Repository URL</label>
            <input
              type="text"
              value={formData.repo_url}
              onChange={(e) => setFormData({ ...formData, repo_url: e.target.value })}
              className="font-mono"
              placeholder="https://github.com/org/repo"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-white mb-2">Compose *</label>
          <textarea
            value={formData.compose}
            onChange={(e) => setFormData({ ...formData, compose: e.target.value })}
            className="font-mono text-xs w-full min-h-[10rem]"
            placeholder="services: { ... }"
            spellCheck={false}
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            docker-compose-style YAML. Parsed and validated on save; the resource footprint is computed from it.
          </p>
        </div>

        <SuggestedPriceHint compose={formData.compose} currency={formData.currency} />

        <div className="grid grid-cols-2 gap-4">
          <MoneyInput
            label="Amount"
            required
            amount={formData.amount}
            currency={formData.currency}
            onChange={({ amount, currency }) => setFormData({ ...formData, amount, currency })}
          />
          <IntervalInput
            label="Billing Interval"
            required
            amount={formData.interval_amount}
            type={formData.interval_type}
            onChange={({ amount, type }) => setFormData({ ...formData, interval_amount: amount, interval_type: type })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Setup Fee ({formData.currency === "BTC" ? "sats" : formData.currency})
            </label>
            <MoneyAmountInput
              value={formData.setup_amount}
              currency={formData.currency}
              onChange={(setup_amount) => setFormData({ ...formData, setup_amount })}
            />
            <p className="text-xs text-gray-500 mt-1">One-off. Default 0.</p>
          </div>
          <div className="flex items-end pb-2">
            <input
              type="checkbox"
              id="app-enabled"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className=""
            />
            <label htmlFor="app-enabled" className="ml-2 text-xs text-white">
              Enabled
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : isEdit ? "Update App" : "Create App"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * One-line "suggested price" hint: the app's compose footprint priced against
 * the selected region's enabled custom pricing plans (and every storage tier
 * within each plan), shown as a min–max band so catalog pricing stays anchored
 * to what the same resources cost on a VM there.
 */
function SuggestedPriceHint({ compose, currency }: { compose: string; currency: string }) {
  const adminApi = useAdminApi();
  const [plans, setPlans] = useState<AdminCustomPricingInfo[] | null>(null);
  const [regionId, setRegionId] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>("Loading pricing...");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pricing, clusters] = await Promise.all([
          adminApi.getCustomPricing({ limit: 100, enabled: true }),
          adminApi.getAppClusters({ limit: 200 }).catch(() => ({ data: [] as AdminAppClusterInfo[] })),
        ]);
        if (cancelled) return;
        setPlans(pricing.data);
        if (pricing.data.length === 0) {
          setStatus("no enabled custom pricing plans to derive a suggestion from");
          return;
        }
        // Default to a region that actually hosts app clusters, since that's
        // where this app would be deployed.
        const clusterRegions = clusters.data.filter((c) => c.enabled).map((c) => c.region_id);
        const priced = new Set(pricing.data.map((m) => m.region_id));
        setRegionId(clusterRegions.find((id) => priced.has(id)) ?? pricing.data[0].region_id);
        setStatus(null);
      } catch (err) {
        console.error("Failed to load custom pricing:", err);
        if (!cancelled) setStatus("could not load custom pricing");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminApi]);

  /** Regions that have at least one enabled pricing plan. */
  const regionOptions = useMemo(() => {
    const seen = new Map<number, string>();
    for (const plan of plans ?? []) {
      if (!seen.has(plan.region_id)) seen.set(plan.region_id, plan.region_name ?? `Region #${plan.region_id}`);
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [plans]);

  const footprint = useMemo(() => parseComposeFootprint(compose).total, [compose]);
  const range = useMemo(() => {
    if (!plans || regionId === null) return null;
    return suggestAppPriceRange(
      footprint,
      plans.filter((p) => p.region_id === regionId),
      currency,
    );
  }, [footprint, plans, regionId, currency]);

  const regionSelect = (
    <select
      value={regionId ?? ""}
      onChange={(e) => setRegionId(Number(e.target.value))}
      aria-label="Region to price against"
      className="!inline !w-auto !py-0 !px-1 !text-xs bg-transparent border-none text-gray-300 focus:ring-0"
    >
      {regionOptions.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
    </select>
  );

  if (status) return <p className="text-xs text-gray-500 mt-1">Suggested price: {status}.</p>;
  if (!range)
    return (
      <p className="text-xs text-gray-500 mt-1">
        Suggested price: no enabled {currency} pricing plan in {regionSelect} can price this app's resources.
      </p>
    );

  const { min, max } = range;
  const band =
    min.total_monthly_cost === max.total_monthly_cost
      ? formatCurrency(min.total_monthly_cost, range.currency)
      : `${formatCurrency(min.total_monthly_cost, range.currency)}–${formatCurrency(max.total_monthly_cost, range.currency)}`;

  return (
    <p className="text-xs text-gray-500 mt-1">
      Suggested: <span className="text-gray-300">{band}</span>/month at cost in {regionSelect} —{" "}
      {min.cpu_cores.toFixed(2)} CPU · {formatBytes(footprint.memory_bytes)} RAM ·{" "}
      {formatBytes(footprint.storage_bytes)} disk across {range.combinations} plan/storage{" "}
      {range.combinations === 1 ? "option" : "options"}.
    </p>
  );
}
